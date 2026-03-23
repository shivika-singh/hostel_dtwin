# ============================================================
# run_simulation.py
# Called by Node.js backend to execute simulation
# Reads input from temp_rooms.json
# Writes result to temp_result.json
# ============================================================

import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from strategy_engine import run_simulation, calculate_baseline

input_path  = os.path.join(os.path.dirname(__file__), "temp_rooms.json")
output_path = os.path.join(os.path.dirname(__file__), "temp_result.json")

with open(input_path, "r") as f:
    data = json.load(f)

strategy_id = data["strategyId"]
rooms_data  = data["roomsData"]

baseline = calculate_baseline(rooms_data)
result   = run_simulation(strategy_id, rooms_data, baseline)
result["baselineMetrics"] = baseline

with open(output_path, "w") as f:
    json.dump(result, f, indent=2)

print("Simulation complete.")