#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include "Constants.h"
#include "Essentials.h"

const char* ssid = "superfan";
const char* password = "20031114";

unsigned long previousMillis = 0;
const long interval = 10; // 每10毫秒執行一次 buffer_update
bool start;
void setup() {
    Serial.begin(115200);
    Serial.println("Booting");
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    // while (WiFi.waitForConnectResult() != WL_CONNECTED) {
        Serial.println("Connection Failed! Rebooting...");
        //delay(5000);
        //ESP.restart();
    // }

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
  // Serial.println(start);
  
  if(digitalRead(BTN_PIN)==0) {
    led_init();
    buffer_init();
    start = 1;
  }
  if(start){
    buffer_update();
  }
  else{
    analogWrite(RED_LED_PIN,    128);
  }
    
}