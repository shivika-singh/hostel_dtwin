import requests
import time
import random
from datetime import datetime

# 🔑 REPLACE WITH YOUR G1 BLOCK WRITE API KEY
WRITE_API_KEY = "AS7MZYR52ILJ0T5I"

THINGSPEAK_URL = "https://api.thingspeak.com/update"

room_id = 1

while True:
    hour = datetime.now().hour

    # ---------- OCCUPANCY LOGIC ----------
    if 8 <= hour <= 10 or 18 <= hour <= 23:
        occupancy = random.choice([1, 1, 0])
    elif 10 < hour < 16:
        occupancy = random.choice([0, 0, 1])
    else:
        occupancy = 1

    # ---------- TEMPERATURE ----------
    temperature = random.randint(24, 32)
    if occupancy == 1:
        temperature += 1

    # ---------- CO2 ----------
    co2 = random.randint(600, 1200) if occupancy else random.randint(400, 500)

    # ---------- FAN ----------
    fan_status = 1 if temperature > 28 else 0

    # ---------- LIGHT ----------
    if occupancy:
        light_status = 1
    else:
        light_status = random.choice([0, 1])  # wastage case

    payload = {
        "api_key": WRITE_API_KEY,
        "field1": room_id,
        "field2": occupancy,
        "field3": temperature,
        "field4": co2,
        "field5": light_status,
        "field6": fan_status
    }

    response = requests.post(THINGSPEAK_URL, data=payload)
    print("ThingSpeak response:", response.text)

    print(f"G1 → Room {room_id} | Occ:{occupancy} Temp:{temperature} CO2:{co2}")

    room_id += 1
    if room_id > 10:
        room_id = 1

    time.sleep(20)  # ThingSpeak free limit
