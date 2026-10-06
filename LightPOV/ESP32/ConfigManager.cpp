#include "ConfigManager.h"

ConfigManager configManager;

void ConfigManager::begin() {
    EEPROM.begin(EEPROM_SIZE);
    load();
}

void ConfigManager::load() {
    EEPROM.get(0, data);
    if (data.magic != CONFIG_MAGIC) {
        Serial.println("Invalid config magic, resetting to defaults");
        resetToDefaults();
        save();
    } else {
        Serial.println("Config loaded from EEPROM");
    }
}

void ConfigManager::save() {
    EEPROM.put(0, data);
    EEPROM.commit();
    Serial.println("Config saved to EEPROM");
}

void ConfigManager::resetToDefaults() {
    data.magic = CONFIG_MAGIC;
    data.lux_id = LUX_ID_DEFAULT;
    data.num_pixels = NUMPIXELS_DEFAULT;
    data.latency_threshold = 500;  // Default 500ms threshold
    
    strncpy(data.ssid[0], WIFI_SSID1_DEFAULT, 32);
    strncpy(data.password[0], WIFI_PASS1_DEFAULT, 64);
    strncpy(data.ssid[1], WIFI_SSID2_DEFAULT, 32);
    strncpy(data.password[1], WIFI_PASS2_DEFAULT, 64);
    strncpy(data.ssid[2], WIFI_SSID3_DEFAULT, 32);
    strncpy(data.password[2], WIFI_PASS3_DEFAULT, 64);
    
    strncpy(data.request_url, WIFI_REQUEST_URL_DEFAULT, 64);
    strncpy(data.time_check_url, WIFI_TIME_CHECK_URL_DEFAULT, 64);
}
