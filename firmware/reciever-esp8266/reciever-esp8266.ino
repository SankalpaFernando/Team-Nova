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

// ───────── HC-12 ─────────
// HC-12 TX → ESP8266 D3
// HC-12 RX → ESP8266 D4
SoftwareSerial HC12(D4, D3);  // ESP8266 RX, TX

void setup() {
  Serial.begin(9600);
  HC12.begin(9600);

  Serial.println("Temperature Receiver Started");

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping send.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", deviceApiKey);

  String jsonBody = "{\"sensor\":\"" + String(sensorId) + "\",\"value\":" + String(temperature, 2) + "}";

  Serial.println("Sending: " + jsonBody);

  int httpCode = http.POST(jsonBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response code: " + String(httpCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("POST failed, error: " + http.errorToString(httpCode));
  }

  http.end();
}