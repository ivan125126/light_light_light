#ifndef CONFIG_H
#define CONFIG_H
#include <Arduino.h>
// #define DEBUGGER
// #define DEBUGGER_TASK_REPORT

#define LUX_ID_DEFAULT 0

/* Type Definition */
#define time_t unsigned long

#define QUEUE_SIZE 10

/* Pin Configuration */
#define PIN_LED 40       // Which pin on the Arduino is connected to the NeoPixels?
#define NUMPIXELS_DEFAULT 32 // How many NeoPixels are attached to the Arduino?

/* Network configuration */ 
/* Network configuration */ 
#define WIFI_SSID1_DEFAULT "allen"
#define WIFI_PASS1_DEFAULT "20041105"
#define WIFI_SSID2_DEFAULT "Esp32"
#define WIFI_PASS2_DEFAULT "hsnu1524"
#define WIFI_SSID3_DEFAULT "NCKUES[AUTO]"
#define WIFI_PASS3_DEFAULT "nckues_auto"

#define WIFI_REQUEST_URL_DEFAULT ":20480/get_effect"
#define WIFI_TIME_CHECK_URL_DEFAULT ":20480/esp_time"

#define WIFI_CONNECT_RETRY 20

#define START_TIME_CHECK_INTERVAL 100

#define FORCE_START_MODE true

/* Rotation Detector */
#define ROTATION_UPDATE_INTERVAL 1 //ms

#define META_PARAMETER_BUF_SIZE 4

#endif
