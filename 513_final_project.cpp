/******************************************************/
//       THIS IS A GENERATED FILE - DO NOT EDIT       //
/******************************************************/

#line 1 "c:/Users/10991/Desktop/project_hardware/513_final_project/src/513_final_project.ino"
#include "Particle.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

void setup();
void loop();
#line 6 "c:/Users/10991/Desktop/project_hardware/513_final_project/src/513_final_project.ino"
SYSTEM_MODE(AUTOMATIC);
SYSTEM_THREAD(ENABLED);

MAX30105 particleSensor;

// ====================== Measurement Buffers ======================
const int MAX_READINGS = 100;
uint32_t irBuffer[MAX_READINGS];
uint32_t redBuffer[MAX_READINGS];

int32_t spo2;
int8_t  validSPO2;
int32_t heartRate;
int8_t  validHeartRate;

// ====================== API / Identification ======================
const char* API_KEY = "YOUR_SECRET_KEY";   // TODO: replace with real key
String hardwareId;                         // Particle device ID (hardwareId in DB)

// ====================== Timing Settings ======================
// For testing: 30 seconds. For production (spec), change to 30 minutes.
const unsigned long MEAS_INTERVAL_MS  = 30000;                 // 30 seconds (testing)
// const unsigned long MEAS_INTERVAL_MS  = 30UL * 60UL * 1000UL;  // 30 minutes (production)

const unsigned long PROMPT_TIMEOUT_MS = 5UL * 60UL * 1000UL;   // 5 minutes
unsigned long lastMeasurementTime = 0;

// How often to check for uploading offline data (when online)
const unsigned long OFFLINE_CHECK_INTERVAL_MS = 60UL * 1000UL; // every 1 minute
unsigned long lastOfflineUploadCheck = 0;

// Maximum age for offline measurements (24 hours, in seconds)
const uint32_t MAX_OFFLINE_AGE_SEC = 24UL * 60UL * 60UL;       // 24 hours

// ====================== Offline Storage (EEPROM) ======================
struct StoredMeasurement {
    uint32_t timestamp;   // Unix time when measurement was taken
    float spo2;
    float heartRate;
};

const int MAX_STORED = 32;                                    // up to 32 offline records
const int EEPROM_START = 0;                                   // base address in EEPROM
const int EEPROM_COUNT_ADDR = EEPROM_START + MAX_STORED * sizeof(StoredMeasurement);

int storedCount = 0;                                          // number of stored records

// ====================== Function Declarations ======================
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut);
bool fingerOnSensor();

void flashBluePrompt();
void flashGreenOK();
void flashYellowOffline();
void flashErrorPurple();

void loadOfflineMetadata();
void saveOfflineCount();
void saveOfflineMeasurement(float spo2, float hr, uint32_t ts);
void clearOfflineStorage();
void uploadOfflineMeasurementsIfOnline();

// ====================== Setup ======================
void setup() {
    Serial.begin(115200);
    // Wait up to 10 seconds so the PC serial monitor can attach
    waitFor(Serial.isConnected, 10000);

    RGB.control(true);
    pinMode(D7, OUTPUT);

    // Identification
    hardwareId = System.deviceID();
    Serial.printlnf("Hardware ID (use this as hardwareId when registering): %s",
                    hardwareId.c_str());

    // Time zone (optional, helpful for debugging)
    Time.zone(-7); // Example: Arizona (UTC-7)

    // Load offline metadata (how many records are in EEPROM)
    loadOfflineMetadata();

    // Initialize MAX30105 sensor over I2C
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("MAX30105 not found! Check wiring and power.");
        flashErrorPurple();      // Blink purple forever to show error
        while (true) {
            // Stay here until the hardware issue is fixed
        }
    }

    // Default sensor configuration
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);   // Low red brightness
    particleSensor.setPulseAmplitudeGreen(0x00); // Turn off green LED

    Serial.println("HeartTrack firmware with offline storage ready.");
    Serial.println("Device will ask for a measurement on a fixed schedule.");

    // Force the first measurement to happen soon after boot
    lastMeasurementTime = millis() - MEAS_INTERVAL_MS;
}

// ====================== Main Loop (synchronous state flow v1) ======================
void loop() {
    unsigned long now = millis();

    // 1) Periodic measurement trigger
    if (now - lastMeasurementTime >= MEAS_INTERVAL_MS) {

        // Update anchor time at the beginning of this cycle
        lastMeasurementTime = now;

        Serial.println("\n=== Time for a new measurement ===");
        Serial.println("Please place your finger on the sensor.");

        unsigned long promptStart = millis();

        // Prompt the user and wait for finger (up to PROMPT_TIMEOUT_MS)
        while (millis() - promptStart < PROMPT_TIMEOUT_MS) {
            flashBluePrompt();          // Blue LED prompt + D7 LED

            // Check if finger is on the sensor (based on IR intensity)
            if (fingerOnSensor()) {
                Serial.println("Finger detected. Measuring now...");

                // Collect samples and run the MAXIM algorithm
                takeMeasurement(&spo2, &heartRate);

                Serial.printf("Result: SpO2 = %ld, HR = %ld\r\n", spo2, heartRate);

                // Prepare JSON payload with API key, hardwareId and timestamp
                time_t nowTs = Time.now();  // Unix timestamp from Particle cloud

                String payload = String::format(
                    "{\"apiKey\":\"%s\",\"hardwareId\":\"%s\","
                    "\"spo2\":%ld,\"heartRate\":%ld,\"timestamp\":%ld}",
                    API_KEY,
                    hardwareId.c_str(),
                    spo2,
                    heartRate,
                    (long)nowTs
                );

                if (WiFi.ready()) {
                    // Online: publish immediately
                    Serial.println("Wi-Fi is ready. Publishing measurement...");
                    Particle.publish("HeartTrack", payload, PRIVATE);
                    flashGreenOK();     // Green LED = uploaded successfully
                } else {
                    // Offline: store locally and flash yellow
                    Serial.println("Wi-Fi NOT ready. Storing measurement offline (EEPROM).");
                    saveOfflineMeasurement(spo2, heartRate, (uint32_t)nowTs);
                    flashYellowOffline();
                }

                // End this loop iteration after a successful measurement (online or offline)
                return;
            }
        }

        // If we get here, the user never put a finger on the sensor in 5 minutes
        Serial.println("Measurement timed out (no finger detected).");

        // Do nothing else in this iteration; wait for the next interval
        return;
    }

    // 2) Periodically attempt to upload offline measurements when online
    if (WiFi.ready() && (millis() - lastOfflineUploadCheck >= OFFLINE_CHECK_INTERVAL_MS)) {
        uploadOfflineMeasurementsIfOnline();
        lastOfflineUploadCheck = millis();
    }

    // Otherwise, idle. System thread keeps Wi-Fi / cloud alive.
}

// ====================== Finger Detection ======================
bool fingerOnSensor() {
    particleSensor.check();
    if (particleSensor.available()) {
        long ir = particleSensor.getIR();
        particleSensor.nextSample();

        // Threshold can be tuned; with a finger, IR is usually much higher.
        return ir > 50000;
    }
    return false;
}

// ====================== Active Measurement ======================
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut) {
    for (int i = 0; i < MAX_READINGS; i++) {
        while (!particleSensor.available()) {
            particleSensor.check();
        }

        redBuffer[i] = particleSensor.getRed();
        irBuffer[i]  = particleSensor.getIR();
        particleSensor.nextSample();
    }

    // Call the official MAXIM algorithm
    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, MAX_READINGS,
        redBuffer,
        spo2Out, &validSPO2,
        hrOut, &validHeartRate
    );

    if (!validSPO2 || !validHeartRate) {
        Serial.println("Warning: measurement marked as INVALID by algorithm.");
    }
}

// ====================== LED Helpers ======================
void flashBluePrompt() {
    digitalWrite(D7, HIGH);
    RGB.color(0, 0, 255);   // Blue
    delay(200);
    digitalWrite(D7, LOW);
    RGB.color(0, 0, 0);
    delay(200);
}

void flashGreenOK() {
    for (int i = 0; i < 3; i++) {
        RGB.color(0, 255, 0); // Green
        delay(200);
        RGB.color(0, 0, 0);
        delay(200);
    }
}

void flashYellowOffline() {
    for (int i = 0; i < 3; i++) {
        RGB.color(255, 255, 0); // Yellow
        delay(200);
        RGB.color(0, 0, 0);
        delay(200);
    }
}

void flashErrorPurple() {
    while (true) {
        RGB.color(255, 0, 255); // Purple
        delay(300);
        RGB.color(0, 0, 0);
        delay(300);
    }
}

// ====================== Offline Storage (EEPROM) ======================

// Load storedCount from EEPROM (called in setup)
void loadOfflineMetadata() {
    EEPROM.get(EEPROM_COUNT_ADDR, storedCount);
    if (storedCount < 0 || storedCount > MAX_STORED) {
        storedCount = 0;
    }
    Serial.printlnf("Offline measurements stored in EEPROM: %d", storedCount);
}

// Save storedCount to EEPROM
void saveOfflineCount() {
    EEPROM.put(EEPROM_COUNT_ADDR, storedCount);
}

// Save a single measurement into EEPROM (if there is space)
void saveOfflineMeasurement(float spo2, float hr, uint32_t ts) {
    if (storedCount >= MAX_STORED) {
        Serial.println("Offline storage FULL, dropping newest measurement.");
        return;
    }

    StoredMeasurement m;
    m.timestamp = ts;
    m.spo2 = spo2;
    m.heartRate = hr;

    int addr = EEPROM_START + storedCount * sizeof(StoredMeasurement);
    EEPROM.put(addr, m);

    storedCount++;
    saveOfflineCount();

    Serial.printlnf("Offline measurement saved. Count = %d", storedCount);
}

// Clear all offline records in EEPROM
void clearOfflineStorage() {
    Serial.println("Clearing all offline measurements from EEPROM...");

    for (int i = 0; i < storedCount; i++) {
        int addr = EEPROM_START + i * sizeof(StoredMeasurement);
        StoredMeasurement blank;
        blank.timestamp = 0;
        blank.spo2 = 0.0f;
        blank.heartRate = 0.0f;
        EEPROM.put(addr, blank);
    }

    storedCount = 0;
    saveOfflineCount();
}

// When online, upload any offline measurements stored in EEPROM
void uploadOfflineMeasurementsIfOnline() {
    if (storedCount <= 0) {
        return; // nothing to upload
    }

    if (!Time.isValid()) {
        // If time is not valid, we cannot reliably check 24h age.
        // Still, we can attempt upload, or wait. Here we choose to upload.
        Serial.println("Time not valid, uploading offline measurements anyway.");
    }

    Serial.printlnf("Uploading %d offline measurements...", storedCount);

    time_t nowTs = Time.now();

    for (int i = 0; i < storedCount; i++) {
        int addr = EEPROM_START + i * sizeof(StoredMeasurement);
        StoredMeasurement m;
        EEPROM.get(addr, m);

        if (m.timestamp == 0) {
            continue; // empty slot
        }

        // Skip records older than 24 hours
        if (Time.isValid() && (nowTs - m.timestamp > MAX_OFFLINE_AGE_SEC)) {
            Serial.printlnf("Skipping stale offline measurement (age: %ld sec)",
                            (long)(nowTs - m.timestamp));
            continue;
        }

        String payload = String::format(
            "{\"apiKey\":\"%s\",\"hardwareId\":\"%s\","
            "\"spo2\":%.2f,\"heartRate\":%.2f,\"timestamp\":%lu}",
            API_KEY,
            hardwareId.c_str(),
            m.spo2,
            m.heartRate,
            (unsigned long)m.timestamp
        );

        Serial.println("Publishing offline measurement...");
        Particle.publish("HeartTrack", payload, PRIVATE);
        delay(2000); // small delay to avoid hitting rate limits
    }

    // After trying to upload all measurements, clear storage
    clearOfflineStorage();
}
