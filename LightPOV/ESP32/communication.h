#ifndef COMMUNICATION_H
#define COMMUNICATION_H

#include <HTTPClient.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <WebServer.h>         // Add WebServer for AP mode
#include <DNSServer.h>         // Optional: for Captive Portal

#include "core.h"
#include "config.h"
#include "ConfigManager.h" // Include header, not just blindly use it

void PrintColorSch(ValueParam* v);
void PrintMode(Mode* m);

class Communication{
private:
    WebServer server; // Config server
    bool isAPMode;

    void OTA();
    void startAP();
    void handleRoot();
    void handleSave();

    /* Helper function to feed color parameter */
    static void feed_color_param(ValueParam* p, String s);

    /* Split the http get message into parameters */
    int feed_data(Mode* m, String s);

public:
    Communication();

    void init();
    
    /* Try to connect to the local AP
     * Block util connected.
     * If failed, start AP mode + Config Server
     */
    void connect();

    /* Send request to server and try to parse the message.
     * Return false if it failed.
     */
    bool receive(Mode* m, int current_id);

    void updateOTA();
    
    /* Call this in loop to handle WebServer clients if in AP mode */
    void handleClient();

    /* Obtain current music time stamp and return current playing effect*/
    time_t check_start_time(uint8_t id, MODES mode, uint8_t* force_mode);

    void WifiErrorHandle();
};

#endif
