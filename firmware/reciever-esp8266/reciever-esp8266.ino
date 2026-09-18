#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SoftwareSerial.h>
#include "config.h"

// ───────── WiFi ─────────
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// ───────── Backend ─────────
const char* serverUrl = SERVER_URL;
const char* deviceApiKey = DEVICE_API_KEY;
const char* sensorId = SENSOR_ID;

// ───────── Reliability Constants ─────────
const int MAX_RETRIES = 3;
const unsigned long RETRY_DELAY_MS = 1000;
const unsigned long HTTP_TIMEOUT_MS = 5000;
const unsigned long WIFI_RECONNECT_TIMEOUT_MS = 5000;

// ───────── HC-12 ─────────
// HC-12 TX → ESP8266 D3
// HC-12 RX → ESP8266 D4
SoftwareSerial HC12(D4, D3);  // ESP8266 RX, TX

bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("WiFi disconnected! Attempting reconnection...");
  WiFi.reconnect();

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt < WIFI_RECONNECT_TIMEOUT_MS)) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("WiFi reconnected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    return true;
  } else {
    Serial.println("");
    Serial.println("WiFi connection failed.");
    return false;
  }
}

void setup() {
  Serial.begin(9600);
  HC12.begin(9600);

  Serial.println("Temperature Receiver Started");

  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt < 10000)) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("");
    Serial.println("WiFi connection timed out. Will retry upon receiving data.");
  }

  Serial.println("Waiting for temperature...");
}

void loop() {
  if (HC12.available()) {
    String received = HC12.readStringUntil('\n');
    received.trim();

    Serial.print("Received: ");
    Serial.println(received);

    if (received.startsWith("TEMP:")) {
      String value = received.substring(5);
      float temperature = value.toFloat();

      Serial.print("Temperature received: ");
      Serial.print(temperature, 2);
      Serial.println(" °C");

      sendToBackend(temperature);
    }
  }
}

void sendToBackend(float temperature) {
  if (!ensureWiFiConnected()) {
    Serial.println("WiFi not connected, skipping send.");
    return;
  }

  Serial.println("Sending reading...");

  String jsonBody = "{\"sensor\":\"" + String(sensorId) + "\",\"value\":" + String(temperature, 2) + "}";
  bool sendSuccess = false;

  for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    WiFiClient client;
    HTTPClient http;

    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", deviceApiKey);

    Serial.println("Sending: " + jsonBody);

    int httpCode = http.POST(jsonBody);

    if (httpCode >= 200 && httpCode < 300) {
      String response = http.getString();
      Serial.println("Response code: " + String(httpCode));
      Serial.println("Response: " + response);
      Serial.println("Successfully sent");
      sendSuccess = true;
      http.end();
      break;
    } else {
      Serial.println("Backend unavailable");
      if (httpCode > 0) {
        String response = http.getString();
        Serial.println("Response code: " + String(httpCode));
        Serial.println("Response: " + response);
      } else {
        Serial.println("POST failed, error: " + http.errorToString(httpCode));
      }
      http.end();

      if (attempt < MAX_RETRIES) {
        Serial.print("Retry attempt ");
        Serial.print(attempt + 1);
        Serial.print(" of ");
        Serial.println(MAX_RETRIES);
        delay(RETRY_DELAY_MS);
      }
    }
  }

  if (!sendSuccess) {
    Serial.println("Failed after retries");
  }
}