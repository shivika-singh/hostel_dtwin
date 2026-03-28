import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from strategy_engine import suggest_strategies

input_path  = os.path.join(os.path.dirname(__file__), "temp_suggest.json")
output_path = os.path.join(os.path.dirname(__file__), "temp_suggestion_result.json")

with open(input_path, "r") as f:
    data = json.load(f)

result = suggest_strategies(data["roomsData"])

with open(output_path, "w") as f:
    json.dump(result, f, indent=2)

print("Suggestion complete.")