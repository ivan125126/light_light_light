#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include "Constants.h"
#include "Essentials.h"

const char* ssid = "superfan";
const char* password = "20031114";

HTTPClient http;
unsigned long musictime = 0;
const long interval = 10; // 每10毫秒執行一次 buffer_update
bool start;

void setup() {
    Serial.begin(115200);
    Serial.println("Booting");
    analogWrite(RED_LED_PIN, 10);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    while (WiFi.waitForConnectResult() != WL_CONNECTED) {
        Serial.println("Connection Failed! Rebooting...");
        delay(500);
        ESP.restart();
    }

    ArduinoOTA.onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH) {
            type = "sketch";
        } else { // U_FS
            type = "filesystem";
        }
        Serial.println("Start updating " + type);
    });
    ArduinoOTA.onEnd([]() {
        Serial.println("\nEnd");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });
    ArduinoOTA.begin();

    Serial.println("Ready");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    led_init();
    
    buffer_init();
    start = 0;
}

void loop() {
  ArduinoOTA.handle();
  if(start == 0){
    WiFiClient client;
    String url = "http://" + WiFi.gatewayIP().toString() + ":10240/gettime?id=" + ID;
    //Serial.println(url);
    http.begin(client, url);  // Updated to new API
    int httpCode = http.GET();
    if (httpCode == 200) {  // Successful request
      String web_data = http.getString();
      musictime = web_data.toInt();
    }
    http.end();
    if (musictime != 0) {
      led_init();
      buffer_init(musictime);
      start = 1;
    }
    analogWrite(BLUE_LED_PIN, 10);
  }
  else{
    buffer_update();
  }
}
