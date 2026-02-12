import requests
import random
import time

# ==============================
# THINGSPEAK CONFIG (FILL THIS)
# ==============================
BLOCKS = {
    "G1": {
        "channel_id": "3258459",
        "write_key": "AS7MZYR52ILJ0T5I"
    },
    "G2": {
        "channel_id": "3258460",
        "write_key": "NMCA19GO06NUQJ7H"
    },
    "B1": {
        "channel_id": "3258461",
        "write_key": "BR1W2GNIYOY66XQS"
    },
    "B2": {
        "channel_id": "3258464",
        "write_key": "43NGADJQ6S1LWQF4"
    }
}

ROOM_COUNT = 10

# ==============================
# ROOM STATE MEMORY
# ==============================
room_state = {}

for block in BLOCKS:
    room_state[block] = {}
    for r in range(1, ROOM_COUNT + 1):
        room_state[block][r] = {
            "occupancy": random.choice([0, 1]),
            "light": 0,
            "fan": 0
        }

# ==============================
# STATE TRANSITION LOGIC
# ==============================
def update_room_state(prev):
    """
    Probabilistic state transitions
    """
    occupancy = prev["occupancy"]

    # Occupancy transition (memory based)
    if occupancy == 1:
        occupancy = 1 if random.random() > 0.15 else 0
    else:
        occupancy = 1 if random.random() < 0.10 else 0

    # Appliance behavior
    if occupancy == 1:
        light = 1 if random.random() < 0.8 else 0
        fan = 1 if random.random() < 0.6 else 0
    else:
        light = 1 if random.random() < 0.1 else 0  # wastage case
        fan = 0

    temperature = random.randint(24, 34)
    co2 = random.randint(400, 1200) if occupancy else random.randint(350, 500)

    return {
        "occupancy": occupancy,
        "light": light,
        "fan": fan,
        "temperature": temperature,
        "co2": co2
    }

# ==============================
# SEND DATA TO THINGSPEAK
# ==============================
def send_to_thingspeak(block, room_id, data):
    url = "https://api.thingspeak.com/update"
    payload = {
        "api_key": BLOCKS[block]["write_key"],
        "field1": room_id,
        "field2": data["occupancy"],
        "field3": data["temperature"],
        "field4": data["co2"],
        "field5": data["light"],
        "field6": data["fan"]
    }
    requests.post(url, data=payload)

# ==============================
# MAIN LOOP
# ==============================
print("Multi-Block Digital Twin Simulator Started")

while True:
    for block in BLOCKS:
        for room_id in range(1, ROOM_COUNT + 1):
            prev = room_state[block][room_id]
            new_state = update_room_state(prev)
            room_state[block][room_id] = new_state

            send_to_thingspeak(block, room_id, new_state)

            print(f"{block} Room {room_id} → Occ:{new_state['occupancy']} "
                  f"T:{new_state['temperature']} CO2:{new_state['co2']}")

            time.sleep(16)  # ThingSpeak-safe interval


        time.sleep(20)

