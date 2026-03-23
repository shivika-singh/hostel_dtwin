import requests
import random
import time

API_URL = "http://localhost:5001/updateData"
ROOMS = ["R101", "R102", "R103"]

while True:
    for room in ROOMS:
        occupancy = random.choice([0, 1])

        # simple logic
        if occupancy == 1:
            light_status = 1
            fan_status = random.choice([0, 1])
        else:
            light_status = random.choice([0, 1])  # wastage case
            fan_status = random.choice([0, 1])

        data = {
            "room_id": room,
            "occupancy": occupancy,
            "light_status": light_status,
            "fan_status": fan_status
        }

        try:
            response = requests.post(API_URL, json=data)
            print(f"Sent data for {room} → {data}")
        except:
            print("Server not reachable")

    time.sleep(5)
