#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SoftwareSerial.h>
#include <LittleFS.h>
#include <time.h>

// ───────── WiFi ─────────
const char* ssid     = "UOJ Student";
const char* password = "uojusu2018";

// ───────── Backend ─────────
const char* serverUrl = "http://192.168.143.172:5000/api/readings";

struct SiteNode {
  const char* nodeId;        // must match NODE_ID in that node's sketch
  const char* siteName;      // only used in Serial messages
  const char* deviceApiKey;
  const char* tempSensorId;
  const char* phSensorId;    // "" = this site has no pH sensor
};

const SiteNode NODES[] = {
  { "1", "Site 1", "mgv_23678923b417679e88cac30a99418ee9", "6ab677c4d4cadaffc8b60437", "6ac9adae9522bc77bb2ccf78" },
  { "2", "Site 2", "mgv_d77ead471057d58b308ce87b378f51c8", "6ac9fb7c448166d9b8a63bf5", "" },
};
const int NODE_COUNT = sizeof(NODES) / sizeof(NODES[0]);

// ───────── Tuning ─────────
const unsigned long HTTP_TIMEOUT_MS       = 3000;    // max wait per upload
const unsigned long BUFFER_FLUSH_INTERVAL = 8000;    // normal gap between flushes
const unsigned long MAX_FLUSH_INTERVAL    = 60000;   // back-off limit when server is down
const unsigned long QUIET_BEFORE_FLUSH_MS = 1500;    // radio must be silent this long
const int           MAX_FLUSH_PER_CALL    = 5;       // uploads per flush
const unsigned long NODE_BLOCK_MS         = 300000;  // pause a node after a 4xx (5 min)
const unsigned long TIME_REPLY_DELAY_MS   = 150;     // let the node's HC-12 switch to receive
const size_t        MAX_BUFFER_BYTES      = 100000;  // cap on /buffer.txt
const int           MAX_LINE_LEN          = 100;     // longest valid radio line

const float TEMP_MIN = -55.0, TEMP_MAX = 125.0;
const float PH_MIN   = 0.0,   PH_MAX   = 14.0;

// ───────── Reliability Constants ─────────
const int MAX_RETRIES = 3;
const unsigned long RETRY_DELAY_MS = 1000;
const unsigned long HTTP_TIMEOUT_MS = 5000;
const unsigned long WIFI_RECONNECT_TIMEOUT_MS = 5000;

// ───────── HC-12 ─────────
SoftwareSerial HC12(D4, D3);
String rxBuffer = "";
bool rxCorrupt = false;
unsigned long lastRadioByteMillis = 0;

// ───────── Buffer ─────────
const char* BUFFER_FILE = "/buffer.txt";
const char* TEMP_FILE   = "/buffer.tmp";
const float NO_READING  = -999;
const unsigned long MIN_VALID_EPOCH = 1700000000UL;
bool fsOk = false;

// ───────── Upload state ─────────
unsigned long lastBufferFlushMillis = 0;
unsigned long flushInterval = BUFFER_FLUSH_INTERVAL;
bool nodeBlocked[NODE_COUNT];
unsigned long nodeBlockedSince[NODE_COUNT];

const int SEND_OK          = 0;   // accepted
const int SEND_RETRY_LATER = 1;   // network/server problem → stop flushing
const int SEND_REJECTED    = 2;   // 4xx → pause this node only

// ───────── ACK + duplicate filter ─────────
const unsigned long ACK_DELAY_MS = 100;           // let the node's HC-12 switch to receive
const long MAX_TS_FUTURE_S = 300;                 // reject timestamps more than 5 min ahead
const long MAX_TS_AGE_S    = 7L * 24 * 3600;      // accept buffered readings up to 7 days old

// recently stored (node, timestamp) pairs, to ignore resends
const int RECENT_SIZE = 32;
unsigned long recentTs[RECENT_SIZE];
uint8_t recentNode[RECENT_SIZE];
int recentPos = 0;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
bool timeValid() {
  return time(nullptr) > (time_t)MIN_VALID_EPOCH;
}

String isoTime(unsigned long ts) {
  time_t t = (time_t)ts;
  struct tm tmv;
  gmtime_r(&t, &tmv);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tmv);
  return String(buf);
}

int findNode(const String& id) {
  for (int i = 0; i < NODE_COUNT; i++) {
    if (id == NODES[i].nodeId) return i;
  }
  return -1;
}

// true only for text like "-12.34" (digits, one dot, optional leading minus)
bool isNumeric(const String& s) {
  if (s.length() == 0 || s.length() > 10) return false;
  bool digit = false, dot = false;
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '-' && i == 0) continue;
    if (c == '.' && !dot) { dot = true; continue; }
    if (c >= '0' && c <= '9') { digit = true; continue; }
    return false;
  }
  return digit;
}

bool isDigits(const String& s) {
  if (s.length() == 0 || s.length() > 10) return false;
  for (unsigned int i = 0; i < s.length(); i++) {
    if (s[i] < '0' || s[i] > '9') return false;
  }
  return true;
}

// Reads "KEY:number". Returns false (value untouched) if missing or not a number.
bool getField(const String& packet, const char* key, float& value) {
  String needle = String(",") + key + ":";
  int start = packet.indexOf(needle);
  if (start == -1) return false;
  start += needle.length();
  int end = packet.indexOf(',', start);
  String text = (end == -1) ? packet.substring(start) : packet.substring(start, end);
  if (!isNumeric(text)) return false;
  value = text.toFloat();
  return true;
}

bool getTimestamp(const String& packet, unsigned long& ts) {
  int start = packet.indexOf(",TS:");
  if (start == -1) return false;
  start += 4;
  int end = packet.indexOf(',', start);
  String text = (end == -1) ? packet.substring(start) : packet.substring(start, end);
  if (!isDigits(text)) return false;
  ts = strtoul(text.c_str(), NULL, 10);
  return true;
}

bool nodeIsBlocked(int i) {
  if (!nodeBlocked[i]) return false;
  if (millis() - nodeBlockedSince[i] >= NODE_BLOCK_MS) {
    nodeBlocked[i] = false;
    return false;
  }
  return true;
}

bool isDuplicate(int nodeIndex, unsigned long ts) {
  for (int i = 0; i < RECENT_SIZE; i++) {
    if (recentTs[i] == ts && recentNode[i] == nodeIndex) return true;
  }
  return false;
}

void rememberTs(int nodeIndex, unsigned long ts) {
  recentTs[recentPos]   = ts;
  recentNode[recentPos] = nodeIndex;
  recentPos = (recentPos + 1) % RECENT_SIZE;
}

void sendAck(const String& id, unsigned long ts) {
  delay(ACK_DELAY_MS);
  HC12.println("ACK:" + id + "," + String(ts));
  Serial.println("ACK sent to node " + id + " for " + String(ts));
}

// ─────────────────────────────────────────────
// Buffer file
// ─────────────────────────────────────────────
// Each line:  nodeIndex,timestamp,temp,ph
bool saveToBuffer(int nodeIndex, unsigned long ts, float temperature, float ph) {
  File file = LittleFS.open(BUFFER_FILE, "a");
  if (!file) {
    Serial.println("Buffer open failed - reading not stored");
    return false;
  }
  if (file.size() > MAX_BUFFER_BYTES) {
    file.close();
    Serial.println("Buffer full - reading not stored");
    return false;
  }
  String tempStr = (temperature != NO_READING) ? String(temperature, 2) : "null";
  String phStr   = (ph != NO_READING)          ? String(ph, 2)          : "null";
  String line = String(nodeIndex) + "," + String(ts) + "," + tempStr + "," + phStr;
  file.println(line);
  file.close();
  Serial.println("Buffered: " + line);
  return true;
}
// ─────────────────────────────────────────────
// Upload one reading. One attempt only: failures stay in the buffer.
// Body: {"readings":[{"sensor":"<id>","value":<num>,"recorded_at":"<ISO UTC>"}]}
int sendToBackend(int nodeIndex, unsigned long ts, float temperature, float ph) {
  if (WiFi.status() != WL_CONNECTED) return SEND_RETRY_LATER;

  const SiteNode& node = NODES[nodeIndex];
  bool sendTemp = (temperature != NO_READING);
  bool sendPh   = (ph != NO_READING);

  if (sendPh && strlen(node.phSensorId) == 0) {
    Serial.println("No pH sensor ID for " + String(node.siteName) + " - pH skipped");
    sendPh = false;
  }
  if (!sendTemp && !sendPh) return SEND_OK;

  String stamp = (ts > 0) ? ",\"recorded_at\":\"" + isoTime(ts) + "\"" : "";
  String body = "{\"readings\":[";
  bool first = true;
  if (sendTemp) {
    body += "{\"sensor\":\"" + String(node.tempSensorId) + "\",\"value\":" + String(temperature, 2) + stamp + "}";
    first = false;
  }
  if (sendPh) {
    if (!first) body += ",";
    body += "{\"sensor\":\"" + String(node.phSensorId) + "\",\"value\":" + String(ph, 2) + stamp + "}";
  }
  body += "]}";

  WiFiClient client;
  HTTPClient http;
  client.setTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, serverUrl)) return SEND_RETRY_LATER;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", node.deviceApiKey);

  Serial.println("POST (" + String(node.siteName) + "): " + body);
  int code = http.POST(body);
  int result;

  if (code >= 200 && code < 300) {
    String response = http.getString();
    Serial.println("✅ Accepted. Code: " + String(code));
    if (response.indexOf("\"count\":0") != -1) {
      Serial.println("⚠️ Backend saved 0 readings! Check sensor IDs.");
    }
    result = SEND_OK;
  } else if (code >= 400 && code < 500) {
    Serial.println("❌ " + String(node.siteName) + " rejected. Code: " + String(code) + " " + http.getString());
    nodeBlocked[nodeIndex] = true;
    nodeBlockedSince[nodeIndex] = millis();
    Serial.println("Pausing " + String(node.siteName) + " uploads for 5 min");
    result = SEND_REJECTED;
  } else {
    Serial.println("❌ Failed. Code: " + String(code) + " " + http.errorToString(code));
    result = SEND_RETRY_LATER;
  }

  http.end();
  return result;
}

// ─────────────────────────────────────────────
// Upload up to MAX_FLUSH_PER_CALL buffered lines. Unsent lines are streamed
// to a temp file (no big String in RAM) which then replaces the buffer.
// Line formats: temp,ph | nodeIndex,temp,ph | nodeIndex,ts,temp,ph
void sendBufferedReadings() {
  if (!LittleFS.exists(BUFFER_FILE)) return;

  File in = LittleFS.open(BUFFER_FILE, "r");
  if (!in) return;
  File out = LittleFS.open(TEMP_FILE, "w");
  if (!out) { in.close(); return; }

  Serial.println("Flushing buffer...");
  int sent = 0, kept = 0;
  bool changed = false;
  bool stopped = false;

  while (in.available()) {
    String line = in.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (stopped) { out.println(line); kept++; continue; }

    int c1 = line.indexOf(',');
    if (c1 == -1) { changed = true; continue; }          // malformed → drop
    int c2 = line.indexOf(',', c1 + 1);
    int c3 = (c2 == -1) ? -1 : line.indexOf(',', c2 + 1);

    int nodeIndex;
    unsigned long ts = 0;
    String tempStr, phStr;

    if (c2 == -1) {
      nodeIndex = 0;
      tempStr = line.substring(0, c1);
      phStr   = line.substring(c1 + 1);
    } else if (c3 == -1) {
      nodeIndex = line.substring(0, c1).toInt();
      tempStr = line.substring(c1 + 1, c2);
      phStr   = line.substring(c2 + 1);
    } else {
      nodeIndex = line.substring(0, c1).toInt();
      ts      = strtoul(line.substring(c1 + 1, c2).c_str(), NULL, 10);
      tempStr = line.substring(c2 + 1, c3);
      phStr   = line.substring(c3 + 1);
    }

    if (nodeIndex < 0 || nodeIndex >= NODE_COUNT) { changed = true; continue; }

    // paused node → keep its line, carry on with the other nodes
    if (nodeIsBlocked(nodeIndex)) { out.println(line); kept++; continue; }

    float bTemp = (tempStr == "null") ? NO_READING : tempStr.toFloat();
    float bPh   = (phStr   == "null") ? NO_READING : phStr.toFloat();

    int r = sendToBackend(nodeIndex, ts, bTemp, bPh);
    if (r == SEND_OK) {
      sent++;
      changed = true;
      flushInterval = BUFFER_FLUSH_INTERVAL;
      if (sent >= MAX_FLUSH_PER_CALL) stopped = true;
      yield();
    } else {
      out.println(line);
      kept++;
      if (r == SEND_RETRY_LATER) {
        stopped = true;
        flushInterval = min(flushInterval * 2, MAX_FLUSH_INTERVAL);   // back off
        Serial.println("Server unreachable - next try in " + String(flushInterval / 1000) + " s");
      }
    }
  }

  in.close();
  out.close();

  if (!changed) {
    LittleFS.remove(TEMP_FILE);                 // nothing changed → no flash rewrite
  } else if (kept == 0) {
    LittleFS.remove(BUFFER_FILE);
    LittleFS.remove(TEMP_FILE);
  } else {
    LittleFS.remove(BUFFER_FILE);
    LittleFS.rename(TEMP_FILE, BUFFER_FILE);
  }

  if (sent > 0) Serial.println("Sent " + String(sent) + ", " + String(kept) + " still buffered");
}

// ─────────────────────────────────────────────
// Radio handlers
// ─────────────────────────────────────────────
// TIMEREQ:1  →  reply  TIME:1,<epoch>
void handleTimeRequest(const String& packet) {
  String id = packet.substring(8);
  id.trim();

  if (findNode(id) == -1) {
    Serial.println("Time request from unknown node '" + id + "' - ignored");
    return;
  }
  if (!timeValid()) {
    Serial.println("Time request but NTP not ready - not replying");
    return;
  }

  delay(TIME_REPLY_DELAY_MS);   // half-duplex: give the node time to switch to receive
  HC12.println("TIME:" + id + "," + String((unsigned long)time(nullptr)));
  Serial.println("Sent time to node " + id);
}

// NODE:1,TS:1760958000,TEMP:25.50,PH:7.20
void handlePacket(const String& packet) {
  if (!packet.startsWith("NODE:")) {
    Serial.println("Ignored - not a sensor packet");
    return;
  }

  int end = packet.indexOf(',');
  if (end == -1) end = packet.length();
  String nodeId = packet.substring(5, end);

  int nodeIndex = findNode(nodeId);
  if (nodeIndex == -1) {
    Serial.println("Unknown node ID '" + nodeId + "' - ignored");
    return;
  }

  // timestamp as sent by the node (the key for ACKs and duplicate checks)
  unsigned long nodeTs = 0;
  bool hasTs = getTimestamp(packet, nodeTs) && nodeTs >= MIN_VALID_EPOCH;

  // a resend of something already stored: just confirm it again
  if (hasTs && isDuplicate(nodeIndex, nodeTs)) {
    Serial.println("Duplicate reading - already stored");
    sendAck(nodeId, nodeTs);
    return;
  }

  // ── validate readings ──
  float temperature = NO_READING;
  float ph          = NO_READING;
  bool hasTemp = getField(packet, "TEMP", temperature);
  bool hasPh   = getField(packet, "PH", ph);

  if (hasTemp && (temperature < TEMP_MIN || temperature > TEMP_MAX)) {
    Serial.println("Temperature out of range - dropped: " + String(temperature));
    temperature = NO_READING;
  }
  if (hasPh && (ph < PH_MIN || ph > PH_MAX)) {
    Serial.println("pH out of range - dropped: " + String(ph));
    ph = NO_READING;
  }

  if (temperature == NO_READING && ph == NO_READING) {
    // no ACK: a clean resend from the node can still succeed
    Serial.println("Packet has no valid readings - ignored");
    return;
  }

  // ── timestamp: keep the node's time unless it is implausible ──
  unsigned long now = timeValid() ? (unsigned long)time(nullptr) : 0;
  unsigned long ts = nodeTs;
  if (hasTs && now > 0) {
    if (ts > now + MAX_TS_FUTURE_S || (ts < now && now - ts > (unsigned long)MAX_TS_AGE_S)) {
      Serial.println("Node timestamp implausible - using base time");
      ts = now;
    }
  } else if (!hasTs) {
    ts = now;
  }

  Serial.println("Site: " + String(NODES[nodeIndex].siteName));
  if (ts > 0)                    Serial.println("Time: " + isoTime(ts));
  if (temperature != NO_READING) Serial.println("Temperature: " + String(temperature, 2) + " C");
  if (ph != NO_READING)          Serial.println("pH: " + String(ph, 2));

  // store first, upload later; ACK only after the reading is safely stored
  bool stored;
  if (fsOk) stored = saveToBuffer(nodeIndex, ts, temperature, ph);
  else      stored = (sendToBackend(nodeIndex, ts, temperature, ph) == SEND_OK);

  if (stored && hasTs) {
    rememberTs(nodeIndex, nodeTs);
    sendAck(nodeId, nodeTs);
  }
}
// ─────────────────────────────────────────────
// Reads the radio one character at a time, discarding noise
void readRadio() {
  int budget = 128;                       // don't let a flood starve loop()
  while (HC12.available() && budget-- > 0) {
    char c = HC12.read();
    lastRadioByteMillis = millis();

    if (c == '\n') {
      if (rxCorrupt) {
        Serial.println("RX: noise discarded");
      } else if (rxBuffer.length() > 0) {
        rxBuffer.trim();
        Serial.println("RX: " + rxBuffer);
        if (rxBuffer.startsWith("TIMEREQ:")) handleTimeRequest(rxBuffer);
        else                                  handlePacket(rxBuffer);
      }
      rxBuffer = "";
      rxCorrupt = false;
    }
    else if (c == '\r') {
      // ignore
    }
    else if (c >= 32 && c <= 126) {         // printable ASCII only
      if (!rxCorrupt) {
        if ((int)rxBuffer.length() < MAX_LINE_LEN) {
          rxBuffer += c;
        } else {
          rxCorrupt = true;                 // too long → noise
          rxBuffer = "";
        }
      }
    }
    else {                                  // non-printable byte → noise
      rxCorrupt = true;
      rxBuffer = "";
    }
  }
}

// ─────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  HC12.begin(9600);

  fsOk = LittleFS.begin();
  if (!fsOk) {
    Serial.println("LittleFS mount failed - formatting...");
    LittleFS.format();
    fsOk = LittleFS.begin();
  }
  Serial.println(fsOk ? "LittleFS ready" : "LittleFS FAILED - readings cannot be buffered!");

  Serial.println("Base Station Started - " + String(NODE_COUNT) + " site node(s) configured");
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi timed out - readings will be buffered");
  }

  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");

  start = millis();
  while (!timeValid() && millis() - start < 8000) {
    delay(250);
  }
  if (timeValid()) {
    Serial.println("Time synced: " + isoTime(time(nullptr)));
  } else {
    Serial.println("NTP not ready yet - syncing in background");
  }

  Serial.println("Waiting for sensor data...");
}

// ─────────────────────────────────────────────
void loop() {
  readRadio();

  // Upload only when due AND the radio has been quiet (no half-received line)
  if (millis() - lastBufferFlushMillis >= flushInterval &&
      millis() - lastRadioByteMillis >= QUIET_BEFORE_FLUSH_MS &&
      rxBuffer.length() == 0) {
    lastBufferFlushMillis = millis();
    if (fsOk && WiFi.status() == WL_CONNECTED && LittleFS.exists(BUFFER_FILE)) {
      sendBufferedReadings();
    }
  }

  yield();
}
