# ============================================================
# SMART HOSTEL DIGITAL TWIN — LOGICAL SIMULATOR
# Uses factual Indian parameters from indian_parameters.py
# Sends realistic, time-aware data to backend
# Location: Jaipur, Rajasthan (real-time weather via API)
# ============================================================

import requests
import time
import random
from datetime import datetime
from indian_parameters import (
    BLOCKS, ROOMS_PER_BLOCK,
    OCCUPANCY_PROBABILITY,
    WASTAGE_PROBABILITY_LIGHT,
    WASTAGE_PROBABILITY_FAN,
    CO2_NORMAL, CO2_HIGH,
    FAN_WATTS, LIGHT_WATTS
)

BACKEND_URL = "http://localhost:5001/simulator/update"

# ============================================================
# REAL-TIME JAIPUR TEMPERATURE
# Defined OUTSIDE update_room — called once per cycle
# ============================================================
def get_jaipur_temperature():
    """
    Fetches real current temperature for Jaipur, Rajasthan
    using Open-Meteo API — free, no API key required.
    Source: Open-Meteo.com (IMD/ERA5 data for India)
    Falls back to IMD monthly averages if API unavailable.
    """
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            "?latitude=26.9124&longitude=75.7873"
            "&current_weather=true"
            "&timezone=Asia/Kolkata"
        )
        response = requests.get(url, timeout=5)
        data = response.json()
        temp = data["current_weather"]["temperature"]
        return round(temp, 1)
    except Exception:
        # Fallback: Jaipur IMD monthly average temperatures
        month = datetime.now().month
        fallback = {
            1: 15.0,   # January
            2: 18.0,   # February
            3: 24.0,   # March
            4: 30.0,   # April
            5: 35.0,   # May
            6: 33.0,   # June (monsoon onset)
            7: 30.0,   # July (monsoon)
            8: 29.0,   # August
            9: 29.0,   # September
            10: 26.0,  # October
            11: 20.0,  # November
            12: 15.0   # December
        }
        return fallback.get(month, 28.0)

# ============================================================
# ROOM STATE MEMORY
# ============================================================
state = {}
for block in BLOCKS:
    state[block] = {}
    for room in range(1, ROOMS_PER_BLOCK + 1):
        hour = datetime.now().hour
        prob = OCCUPANCY_PROBABILITY[hour]
        state[block][room] = {
            "occupancy":   1 if random.random() < prob else 0,
            "temperature": get_jaipur_temperature(),
            "co2":         CO2_NORMAL,
            "light":       0,
            "fan":         0
        }

# ============================================================
# CORE LOGIC
# ============================================================
def update_room(prev, hour, outdoor_temp):
    """
    Updates room state based on:
    1. Real-time Jaipur outdoor temperature
    2. Previous state (memory-based transitions)
    3. Indian hostel behavioural patterns
    4. Physical sensor models (CO2 accumulation, temp drift)
    """

    # --- OCCUPANCY ---
    target_prob = OCCUPANCY_PROBABILITY[hour]
    prev_occ = prev["occupancy"]

    if prev_occ == 1:
        occupancy = 1 if random.random() < 0.90 else 0
    else:
        occupancy = 1 if random.random() < target_prob * 0.5 else 0

    # --- TEMPERATURE ---
    # Real outdoor temp from API + body heat + sensor noise
    body_heat    = 1.5 if occupancy == 1 else 0
    sensor_noise = random.uniform(-0.3, 0.3)
    temperature  = round(outdoor_temp + body_heat + sensor_noise, 1)

    # --- CO2 ---
    # ASHRAE 62.1 — 2 people in 120 sqft room
    if occupancy == 1:
        co2 = min(prev["co2"] + random.randint(15, 45), CO2_HIGH)
    else:
        co2 = max(prev["co2"] - random.randint(10, 25), CO2_NORMAL)
    co2 = round(co2)

    # --- APPLIANCES ---
    if occupancy == 1:
        light = 1 if random.random() < 0.85 else 0
        if temperature > 28:
            fan = 1 if random.random() < 0.80 else 0
        else:
            fan = 1 if random.random() < 0.40 else 0
    else:
        # Wastage — student forgot to switch off
        light = 1 if random.random() < WASTAGE_PROBABILITY_LIGHT else 0
        fan   = 1 if random.random() < WASTAGE_PROBABILITY_FAN   else 0

    return {
        "occupancy":   occupancy,
        "temperature": temperature,
        "co2":         co2,
        "light":       light,
        "fan":         fan
    }

# ============================================================
# MAIN LOOP
# ============================================================
print("=" * 60)
print("  SMART HOSTEL SIMULATOR — India Standard Parameters")
print("  Location : Jaipur, Rajasthan")
print(f"  Blocks   : {BLOCKS}")
print(f"  Rooms    : {ROOMS_PER_BLOCK} per block = "
      f"{len(BLOCKS) * ROOMS_PER_BLOCK} total")
print("=" * 60)

while True:
    hour = datetime.now().hour

    # Fetch real Jaipur temperature ONCE per full cycle
    outdoor_temp = get_jaipur_temperature()
    print(f"  🌡️  Jaipur live temperature: {outdoor_temp}°C")

    for block in BLOCKS:
        for room in range(1, ROOMS_PER_BLOCK + 1):

            new_state = update_room(state[block][room], hour, outdoor_temp)
            state[block][room] = new_state

            power = (LIGHT_WATTS if new_state["light"] else 0) + \
                    (FAN_WATTS   if new_state["fan"]   else 0)

            wastage = (not new_state["occupancy"]) and \
                      (new_state["light"] or new_state["fan"])

            payload = {
                "block":       block,
                "room":        room,
                "occupancy":   new_state["occupancy"],
                "temperature": new_state["temperature"],
                "co2":         new_state["co2"],
                "light":       new_state["light"],
                "fan":         new_state["fan"],
                "power":       power,
                "wastage":     wastage,
                "hour":        hour
            }

            try:
                requests.post(BACKEND_URL, json=payload, timeout=1)
                if wastage:
                    status = "⚠️  WASTAGE"
                elif new_state["occupancy"]:
                    status = "🟢 OCCUPIED"
                else:
                    status = "⚪ EMPTY"

                print(
                    f"{block}-R{room:02d} | "
                    f"T:{new_state['temperature']:4.1f}°C | "
                    f"CO2:{new_state['co2']:4d}ppm | "
                    f"💡{'ON ' if new_state['light'] else 'OFF'} | "
                    f"🌀{'ON ' if new_state['fan'] else 'OFF'} | "
                    f"{power:3d}W | {status}"
                )
            except Exception:
                print("  Backend not reachable — is server.js running?")

            time.sleep(5)

    print("-" * 60)
    time.sleep(10)