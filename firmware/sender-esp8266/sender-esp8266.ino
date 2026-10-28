#include <OneWire.h>
#include <DallasTemperature.h>
#include <SoftwareSerial.h>
#include <LittleFS.h>

// ───────── Settings ─────────
#define CALIBRATION_MODE false
#define NODE_ID "1"
#define HAS_PH true

// ───────── Temperature Sensor ─────────
#define ONE_WIRE_BUS D2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ───────── pH Sensor ─────────
#define PH_PIN A0
const float VOLT_AT_PH7 = 1.65;   // placeholder
const float VOLT_AT_PH4 = 2.01;   // placeholder
const bool PH_CALIBRATED = false; // set true only after real calibration

// ───────── HC-12 ─────────
SoftwareSerial HC12(D4, D3);

// ───────── Time Synchronization ─────────
unsigned long syncEpoch  = 0;
unsigned long syncMillis = 0;
const unsigned long RESYNC_MS = 3600000UL;
unsigned long lastReqMillis = 0;
unsigned long reqInterval   = 30000;

// ───────── Timers / radio buffer ─────────
unsigned long lastTxMillis = 0;
unsigned long txInterval   = 20000;
String rxBuffer = "";
bool rxCorrupt = false;
const int MAX_LINE_LEN = 60;

// ▶▶ NEW ───────── Pending buffer (LittleFS) ─────────
const char*  PENDING_FILE      = "/pending.txt";   // lines:  ts,temp,ph
const char*  PENDING_TMP       = "/pending.tmp";
const size_t MAX_PENDING_BYTES = 20000;            // ~600 readings, ~4 h of outage
const int    COMPACT_EVERY     = 20;               // rewrite file after this many acked lines
const unsigned long ACK_TIMEOUT_MS = 4000;         // wait for the base's ACK
const unsigned long DRAIN_GAP_MS   = 2500;         // gap between resends
const float  NO_VALUE = -999;                      // marks a missing temp/pH

bool   fsOk = false;
size_t pendingOffset = 0;        // bytes at the start of the file already acknowledged
int    ackedSinceCompact = 0;
bool   linkAlive = false;        // true after an ACK, false after a timeout

// ▶▶ NEW: the one reading currently waiting for an ACK
enum InflightKind { NONE, NEW_READING, PENDING_LINE };
InflightKind  inflight = NONE;
unsigned long inflightTs = 0;
float         inflightTemp = NO_VALUE, inflightPh = NO_VALUE;
unsigned long inflightStart = 0;
size_t        inflightLineBytes = 0;     // size of the pending line being resent
unsigned long lastDrainMillis = 0;

unsigned long nowEpoch() {
  if (syncEpoch == 0) return 0;
  return syncEpoch + (millis() - syncMillis) / 1000;
}

void requestTime() {
  HC12.println("TIMEREQ:" + String(NODE_ID));
  Serial.println("Requested time from base...");
  lastReqMillis = millis();
  reqInterval = 25000 + random(0, 10000);
}

// ───────── pH ─────────
float readPhVoltage() {
  const int SAMPLES = 30;
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(PH_PIN);
    delay(10);
  }
  float raw = sum / (float)SAMPLES;
  return raw * 3.3 / 1023.0;
}

float voltageToPh(float voltage) {
  float slope = (7.0 - 4.0) / (VOLT_AT_PH7 - VOLT_AT_PH4);
  float ph = 7.0 + slope * (voltage - VOLT_AT_PH7);
  return constrain(ph, 0.0, 14.0);
}

// ▶▶ NEW ─────────────────────────────────────────────
// Pending-file helpers
// ─────────────────────────────────────────────────────
String fmtVal(float v) { return (v == NO_VALUE) ? "null" : String(v, 2); }

// true if the file holds lines that have not been acknowledged yet
bool pendingHasData() {
  if (!fsOk || !LittleFS.exists(PENDING_FILE)) return false;
  File f = LittleFS.open(PENDING_FILE, "r");
  if (!f) return false;
  size_t sz = f.size();
  f.close();
  return sz > pendingOffset;
}

// Rewrite the file without the acknowledged part (or delete it if all done)
void compactPending() {
  if (!LittleFS.exists(PENDING_FILE)) { pendingOffset = 0; ackedSinceCompact = 0; return; }
  File in = LittleFS.open(PENDING_FILE, "r");
  if (!in) return;

  if (pendingOffset >= in.size()) {
    in.close();
    LittleFS.remove(PENDING_FILE);
    pendingOffset = 0;
    ackedSinceCompact = 0;
    return;
  }

  File out = LittleFS.open(PENDING_TMP, "w");
  if (!out) { in.close(); return; }

  in.seek(pendingOffset);
  uint8_t buf[64];
  int n;
  while ((n = in.read(buf, sizeof(buf))) > 0) out.write(buf, n);
  in.close();
  out.close();

  LittleFS.remove(PENDING_FILE);
  LittleFS.rename(PENDING_TMP, PENDING_FILE);
  pendingOffset = 0;
  ackedSinceCompact = 0;
}

// Buffer full: throw away the oldest n lines
void dropOldestLines(int n) {
  File f = LittleFS.open(PENDING_FILE, "r");
  if (!f) return;
  f.seek(pendingOffset);
  for (int i = 0; i < n && f.available(); i++) {
    String l = f.readStringUntil('\n');
    pendingOffset += l.length() + 1;
  }
  f.close();
  compactPending();
  Serial.println("Pending buffer full - oldest readings dropped");
}

void appendPending(unsigned long ts, float t, float p) {
  if (!fsOk) { Serial.println("No file system - reading lost"); return; }

  if (LittleFS.exists(PENDING_FILE)) {
    File chk = LittleFS.open(PENDING_FILE, "r");
    if (chk) {
      size_t live = (chk.size() > pendingOffset) ? chk.size() - pendingOffset : 0;
      chk.close();
      if (live > MAX_PENDING_BYTES) dropOldestLines(50);
    }
  }

  File f = LittleFS.open(PENDING_FILE, "a");
  if (!f) { Serial.println("Pending open failed - reading lost"); return; }
  String line = String(ts) + "," + fmtVal(t) + "," + fmtVal(p);
  f.println(line);
  f.close();
  Serial.println("Buffered on node: " + line);
}

// Builds and transmits one reading packet
void sendReadingPacket(unsigned long ts, float t, float p) {
  String packet = "NODE:" + String(NODE_ID);
  if (ts > 0)         packet += ",TS:" + String(ts);
  if (t != NO_VALUE)  packet += ",TEMP:" + String(t, 2);
  if (p != NO_VALUE)  packet += ",PH:" + String(p, 2);
  HC12.println(packet);
  Serial.println("Sent through HC-12: " + packet);
}

void startInflight(InflightKind kind, unsigned long ts, float t, float p, size_t lineBytes) {
  inflight = kind;
  inflightTs = ts;
  inflightTemp = t;
  inflightPh = p;
  inflightLineBytes = lineBytes;
  inflightStart = millis();
}

// No ACK arrived in time
void resolveTimeout() {
  linkAlive = false;
  if (inflight == NEW_READING) {
    Serial.println("No ACK - saving reading to pending buffer");
    appendPending(inflightTs, inflightTemp, inflightPh);
  } else if (inflight == PENDING_LINE) {
    Serial.println("No ACK for resend - keeping it in the buffer");
  }
  inflight = NONE;
}

// The base acknowledged timestamp ts
void handleAck(unsigned long ts) {
  linkAlive = true;
  if (inflight == NONE || ts != inflightTs) return;   // late or unrelated ACK

  if (inflight == PENDING_LINE) {
    pendingOffset += inflightLineBytes;                // line is done
    ackedSinceCompact++;
    if (!pendingHasData() || ackedSinceCompact >= COMPACT_EVERY) compactPending();
  }
  Serial.println("ACK received for " + String(ts));
  inflight = NONE;
}

// Resend the oldest unacknowledged pending line
void drainOnePending() {
  while (true) {
    File f = LittleFS.open(PENDING_FILE, "r");
    if (!f) return;
    if (pendingOffset >= f.size()) { f.close(); compactPending(); return; }

    f.seek(pendingOffset);
    String raw = f.readStringUntil('\n');
    f.close();
    size_t bytes = raw.length() + 1;
    String line = raw;
    line.trim();

    int c1 = line.indexOf(',');
    int c2 = (c1 == -1) ? -1 : line.indexOf(',', c1 + 1);
    unsigned long ts = (c1 > 0) ? strtoul(line.substring(0, c1).c_str(), NULL, 10) : 0;

    if (c2 == -1 || ts < 1700000000UL) {               // blank or malformed → skip it
      pendingOffset += bytes;
      continue;
    }

    String ts_t = line.substring(c1 + 1, c2);
    String ts_p = line.substring(c2 + 1);
    float t = (ts_t == "null") ? NO_VALUE : ts_t.toFloat();
    float p = (ts_p == "null") ? NO_VALUE : ts_p.toFloat();

    Serial.println("Resending buffered reading " + String(ts));
    sendReadingPacket(ts, t, p);
    startInflight(PENDING_LINE, ts, t, p, bytes);
    return;
  }
}

// ───────── Incoming radio (non-blocking, noise-filtered) ─────────
bool allDigits(const String& s) {
  if (s.length() == 0 || s.length() > 10) return false;
  for (unsigned int i = 0; i < s.length(); i++) {
    if (s[i] < '0' || s[i] > '9') return false;
  }
  return true;
}

void handleIncomingHC12() {
  int budget = 128;
  while (HC12.available() && budget-- > 0) {
    char c = HC12.read();

    if (c == '\n') {
      if (!rxCorrupt && rxBuffer.length() > 0) {
        rxBuffer.trim();
        Serial.println("RX: [" + rxBuffer + "]");

        String timePrefix = "TIME:" + String(NODE_ID) + ",";
        String ackPrefix  = "ACK:"  + String(NODE_ID) + ",";    // ▶▶ NEW

        if (rxBuffer.startsWith(timePrefix)) {
          String num = rxBuffer.substring(timePrefix.length());
          if (allDigits(num)) {
            unsigned long t = strtoul(num.c_str(), NULL, 10);
            if (t > 1700000000UL) {
              syncEpoch  = t;
              syncMillis = millis();
              Serial.println(">>> Time synced: " + String(t));
            }
          }
        }
        else if (rxBuffer.startsWith(ackPrefix)) {              // ▶▶ NEW
          String num = rxBuffer.substring(ackPrefix.length());
          if (allDigits(num)) handleAck(strtoul(num.c_str(), NULL, 10));
        }
      } else if (rxCorrupt) {
        Serial.println("RX: noise discarded");
      }
      rxBuffer = "";
      rxCorrupt = false;
    }
    else if (c == '\r') { }
    else if (c >= 32 && c <= 126) {
      if (!rxCorrupt) {
        if ((int)rxBuffer.length() < MAX_LINE_LEN) rxBuffer += c;
        else { rxCorrupt = true; rxBuffer = ""; }
      }
    }
    else { rxCorrupt = true; rxBuffer = ""; }
  }
}

// ───────── Sense and transmit ─────────
void performTransmission() {
  // ▶▶ NEW: if something is still waiting for an ACK, settle it before moving on
  if (inflight != NONE) resolveTimeout();

  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);
  unsigned long ts = nowEpoch();               // moment of sensing

  bool tempOk = (temperature != DEVICE_DISCONNECTED_C) &&
                (temperature >= -55.0) && (temperature <= 125.0);

  float phVoltage = 0.0, ph = 0.0;
  bool phOk = false;
  if (HAS_PH && PH_CALIBRATED && VOLT_AT_PH7 != VOLT_AT_PH4) {
    phVoltage = readPhVoltage();
    if (phVoltage > 0.05 && phVoltage <= 3.30) {
      ph = voltageToPh(phVoltage);
      phOk = true;
    }
  }

  if (tempOk) { Serial.print("Temperature: "); Serial.print(temperature, 2); Serial.println(" C"); }
  else        { Serial.println("Temperature sensor not detected!"); }

  if (phOk) {
    Serial.print("pH: "); Serial.print(ph, 2);
    Serial.print(" ("); Serial.print(phVoltage, 3); Serial.println(" V)");
  } else if (HAS_PH && !PH_CALIBRATED) Serial.println("pH not calibrated - not sent");
  else if (HAS_PH)                     Serial.println("pH sensor not detected!");

  if (tempOk || phOk) {
    float tOut = tempOk ? temperature : NO_VALUE;
    float pOut = phOk   ? ph          : NO_VALUE;
    sendReadingPacket(ts, tOut, pOut);

    // ▶▶ NEW: readings with a real timestamp wait for an ACK (and are buffered if none comes)
    if (ts > 0 && fsOk) startInflight(NEW_READING, ts, tOut, pOut, 0);
  } else {
    Serial.println("No valid readings - nothing sent");
  }

  txInterval = 20000 + random(0, 4000);
}

// ───────── Setup ─────────
void setup() {
  Serial.begin(9600);
  HC12.begin(9600);
  sensors.begin();
  randomSeed(ESP.getChipId());

  // ▶▶ NEW: mount the file system (format once if it fails)
  fsOk = LittleFS.begin();
  if (!fsOk) {
    Serial.println("LittleFS mount failed - formatting...");
    LittleFS.format();
    fsOk = LittleFS.begin();
  }
  Serial.println(fsOk ? "LittleFS ready" : "LittleFS FAILED - no node buffering");
  if (pendingHasData()) Serial.println("Unsent readings found from before restart");

  Serial.println(CALIBRATION_MODE ? "pH CALIBRATION MODE" : "Sender Started");
  Serial.println("Node ID: " + String(NODE_ID));

  if (!CALIBRATION_MODE) requestTime();
}

// ───────── Loop ─────────
void loop() {
  handleIncomingHC12();

  if (CALIBRATION_MODE) {
    static unsigned long lastCalib = 0;
    if (millis() - lastCalib >= 1000) {
      lastCalib = millis();
      Serial.print("pH sensor voltage: ");
      Serial.print(readPhVoltage(), 3);
      Serial.println(" V");
    }
    return;
  }

  // ▶▶ NEW: ACK deadline (checked after reading the radio, so a waiting ACK is seen first)
  if (inflight != NONE && millis() - inflightStart >= ACK_TIMEOUT_MS) {
    resolveTimeout();
  }

  // Time sync
  bool needSync = (syncEpoch == 0) || (millis() - syncMillis >= RESYNC_MS);
  if (needSync && millis() - lastReqMillis >= reqInterval) requestTime();

  // Normal sense-and-send timer
  if (millis() - lastTxMillis >= txInterval) {
    lastTxMillis = millis();
    performTransmission();
  }

  // ▶▶ NEW: resend old readings, but only while the link works, nothing is in
  // flight, and the next regular transmission is more than 6 s away
  if (inflight == NONE && linkAlive && fsOk &&
      millis() - lastDrainMillis >= DRAIN_GAP_MS &&
      (millis() - lastTxMillis) + 6000 < txInterval) {
    lastDrainMillis = millis();
    if (pendingHasData()) drainOnePending();
  }

  yield();
}