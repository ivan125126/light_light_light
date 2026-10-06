#include "core.h"
#include "config.h"
#include "modes.h"
#include "communication.h"
#include "ConfigManager.h"

TaskHandle_t LED_UPDATE;
TaskHandle_t WIFI_HANDLE;

Effects effect = Effects();
Communication comm;

void setup(){
    Serial.begin(115200);
    Serial.println("Start up");
    configManager.begin();
    effect.lightOnOneLED(CHSV(0, 200, 50), configManager.data.lux_id + 1);
    delay(3000);
    comm.init();

    xTaskCreatePinnedToCore(
        WIFI_HANDLE_CODE,
        "wifi_handle",
        10000,
        NULL,
        1,
        &WIFI_HANDLE,
        0);
    vTaskDelay(pdMS_TO_TICKS(100));
    
    xTaskCreatePinnedToCore(
        LED_UPDATE_CODE, // Function to implement the task
        "led_update",    // Name of the task
        10000,           // Stack size in words
        NULL,            // Task input parameter
        1,               // Priority of the task
        &LED_UPDATE,     // Task handle.
        1);              // Core where the task should run
    vTaskDelay(pdMS_TO_TICKS(100));
}

void LED_UPDATE_CODE(void *pvParameters)
{
    while (1){
        effect.perform();
    }
}

void WIFI_HANDLE_CODE(void *pvParameters)
{
    time_t last_check_time = millis();
    Serial.print("Task1 running on core ");
    Serial.println(xPortGetCoreID());
    while (1)
    {
        uint8_t current_id = effect.checkBufferAvailable();
        
        comm.handleClient(); // Handle AP mode usage

        if (current_id >= 0){
            Mode m;
            if ( comm.receive(&m, current_id) ){
                effect.feedNewEffect(&m);
            }
            #ifdef DEBUGGER_TASK_REPORT
            else
                Serial.println("Failed to receive from server");
            #endif
        }

        if (millis() - last_check_time > START_TIME_CHECK_INTERVAL){
            Mode m;
            effect.buffer.peek(&m);
            effect.setMusicTime( comm.check_start_time(configManager.data.lux_id, m.mode, &effect.force_mode) );
            last_check_time = millis();
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void loop()
{
    comm.updateOTA();
    // effect.update();

    // Check WiFi connection status periodically
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected, trying to reconnect...");
        comm.WifiErrorHandle(); // Attempt to reconnect WiFi
    }
    vTaskDelay(pdMS_TO_TICKS(1000)); // Add a delay to avoid spamming the reconnection attempts
}
