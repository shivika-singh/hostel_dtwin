import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from lstm_predictor import predict_all_rooms

input_path  = os.path.join(os.path.dirname(__file__), "temp_predict_input.json")
output_path = os.path.join(os.path.dirname(__file__), "temp_predict_output.json")

with open(input_path) as f:
    data = json.load(f)

result = predict_all_rooms(data["roomsData"])

with open(output_path, "w") as f:
    json.dump(result, f, indent=2)

print("Prediction complete.")