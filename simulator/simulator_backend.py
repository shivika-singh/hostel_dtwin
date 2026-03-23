# ============================================================
# SMART HOSTEL DIGITAL TWIN — LOGICAL SIMULATOR
# Uses factual Indian parameters from indian_parameters.py
# Sends realistic, time-aware data to backend
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
    TEMP_COMFORT_MIN, TEMP_COMFORT_MAX,
    CO2_NORMAL, CO2_HIGH,
    FAN_WATTS, LIGHT_WATTS
)

BACKEND_URL = "http://localhost:5001/simulator/update"

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
            "temperature": random.uniform(TEMP_COMFORT_MIN, TEMP_COMFORT_MAX),
            "co2":         CO2_NORMAL,
            "light":       0,
            "fan":         0
        }

# ============================================================
# CORE LOGIC
# ============================================================
def update_room(prev, hour):
    """
    Updates room state based on:
    1. Time of day (class hours vs evening vs night)
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
    # Jodhpur IMD average temperatures by time of day
    if 6 <= hour <= 10:
        base_temp = 26.0
    elif 11 <= hour <= 16:
        base_temp = 32.0   # Jodhpur afternoon peak
    elif 17 <= hour <= 20:
        base_temp = 29.0
    else:
        base_temp = 25.0

    body_heat    = 1.5 if occupancy == 1 else 0
    sensor_noise = random.uniform(-0.3, 0.3)
    temperature  = round(base_temp + body_heat + sensor_noise, 1)

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
print("  Location : Jodhpur, Rajasthan")
print(f"  Blocks   : {BLOCKS}")
print(f"  Rooms    : {ROOMS_PER_BLOCK} per block = "
      f"{len(BLOCKS) * ROOMS_PER_BLOCK} total")
print("=" * 60)

while True:
    hour = datetime.now().hour

    for block in BLOCKS:
        for room in range(1, ROOMS_PER_BLOCK + 1):

            new_state = update_room(state[block][room], hour)
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
                print(f"  Backend not reachable — is server.js running?")

            time.sleep(5)

    print("-" * 60)
    time.sleep(10)