import requests
import random
import time

BACKEND_URL = "http://localhost:5000/simulator/update"

BLOCKS = ["G1", "G2", "B1", "B2"]
ROOMS_PER_BLOCK = 10

# =========================
# ROOM STATE MEMORY
# =========================
state = {}

for block in BLOCKS:
    state[block] = {}
    for room in range(1, ROOMS_PER_BLOCK + 1):
        state[block][room] = {
            "occupancy": random.choice([0, 1]),
            "temperature": random.randint(24, 30),
            "co2": random.randint(380, 500),
            "light": 0,
            "fan": 0
        }

# =========================
# STATE UPDATE LOGIC
# =========================
def update_room(prev):
    occ = prev["occupancy"]

    # Occupancy transition (memory-based)
    if occ == 1 and random.random() < 0.1:
        occ = 0
    elif occ == 0 and random.random() < 0.08:
        occ = 1

    # CO2 logic
    if occ == 1:
        co2 = min(prev["co2"] + random.randint(20, 60), 1200)
    else:
        co2 = max(prev["co2"] - random.randint(10, 30), 380)

    # Temperature drift
    temp = prev["temperature"] + random.choice([-1, 0, 1])
    temp = max(20, min(temp, 36))

    # Appliance behavior
    if occ == 1:
        light = 1 if random.random() < 0.8 else 0
        fan = 1 if temp > 28 and random.random() < 0.7 else 0
    else:
        # Wastage cases
        light = 1 if random.random() < 0.15 else 0
        fan = 1 if random.random() < 0.05 else 0

    return {
        "occupancy": occ,
        "temperature": temp,
        "co2": co2,
        "light": light,
        "fan": fan
    }

# =========================
# MAIN LOOP
# =========================
print("Backend-centric Digital Twin Simulator started")

while True:
    for block in BLOCKS:
        for room in range(1, ROOMS_PER_BLOCK + 1):
            new_state = update_room(state[block][room])
            state[block][room] = new_state

            payload = {
                "block": block,
                "room": room,
                "occupancy": new_state["occupancy"],
                "temperature": new_state["temperature"],
                "co2": new_state["co2"],
                "light": new_state["light"],
                "fan": new_state["fan"]
            }

            try:
                requests.post(BACKEND_URL, json=payload, timeout=1)
            except:
                print("Backend not reachable")

            time.sleep(0.3)  # stagger rooms

        time.sleep(1.5)  # stagger blocks
