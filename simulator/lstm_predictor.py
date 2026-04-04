# ============================================================
# LSTM LIVE PREDICTOR
# Called by backend API to get real-time predictions
# Reads current room state, returns vacancy prediction
# ============================================================

import numpy as np
import json
import os
import sys

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

MODEL_DIR = os.path.dirname(__file__)

# Load model and scaler once at import time
try:
    from tensorflow.keras.models import load_model
    _model = load_model(os.path.join(MODEL_DIR, "lstm_model.keras"))
    print("✅ LSTM model loaded")
except Exception as e:
    _model = None
    print(f"⚠️  LSTM model not loaded: {e}")

try:
    with open(os.path.join(MODEL_DIR, "scaler_params.json")) as f:
        _sp = json.load(f)
    _scale = np.array(_sp["scale_"])
    _min   = np.array(_sp["min_"])
    FEATURES      = _sp["features"]
    SEQUENCE_LEN  = _sp["sequence_len"]
    HORIZON_MINS  = _sp["horizon"] * 5
except Exception as e:
    _scale = None
    print(f"⚠️  Scaler not loaded: {e}")

# In-memory buffer: room_id → list of recent feature vectors
_room_buffers = {}

def _extract_features(room_state):
    """
    Extract feature vector from a room state dict.
    Matches FEATURES order: hour, dow, temperature, co2,
                            light, fan, power, occupancy
    """
    from datetime import datetime
    now = datetime.now()
    return [
        now.hour,
        now.weekday(),
        room_state.get("temperature", 28.0),
        room_state.get("co2", 400),
        room_state.get("light", 0),
        room_state.get("fan", 0),
        room_state.get("power", 0),
        1 if room_state.get("inferredOccupancy") == "OCCUPIED"
          else int(room_state.get("occupancy", 0))
    ]

def _scale_features(vec):
    """Apply MinMax scaling."""
    return (np.array(vec) * _scale + _min)

def update_buffer(room_id, room_state):
    """
    Call this every sensor update to maintain rolling buffer.
    """
    if room_id not in _room_buffers:
        _room_buffers[room_id] = []
    feat = _extract_features(room_state)
    _room_buffers[room_id].append(feat)
    # Keep only last SEQUENCE_LEN entries
    if len(_room_buffers[room_id]) > SEQUENCE_LEN:
        _room_buffers[room_id] = _room_buffers[room_id][-SEQUENCE_LEN:]

def predict_room(room_id, room_state):
    """
    Predict whether the room will be occupied in HORIZON_MINS.
    Returns dict with prediction, confidence, and recommendation.
    """
    if _model is None or _scale is None:
        return {"error": "Model not loaded"}

    # Update buffer with latest state
    update_buffer(room_id, room_state)
    buf = _room_buffers.get(room_id, [])

    if len(buf) < SEQUENCE_LEN:
        # Not enough history yet — use rule-based fallback
        from datetime import datetime
        hour = datetime.now().hour
        from indian_parameters import OCCUPANCY_PROBABILITY
        prob = OCCUPANCY_PROBABILITY[hour]
        return {
            "roomId":          room_id,
            "method":          "rule_based_fallback",
            "willBeOccupied":  prob >= 0.5,
            "confidence":      round(prob * 100, 1),
            "horizonMinutes":  HORIZON_MINS,
            "historyAvailable":len(buf),
            "historyNeeded":   SEQUENCE_LEN,
            "recommendation":  "Collecting data — using time-based rules"
        }

    # Scale the sequence
    seq = np.array(buf[-SEQUENCE_LEN:], dtype=np.float32)
    seq_scaled = (seq * _scale + _min)
    seq_input  = seq_scaled.reshape(1, SEQUENCE_LEN, len(FEATURES))

    # Predict
    prob = float(_model.predict(seq_input, verbose=0)[0][0])
    will_be_occupied = prob >= 0.5

    # Recommendation logic
    currently_occupied = room_state.get("occupancy", 0) == 1
    has_wastage        = room_state.get("wastage", False)

    if not will_be_occupied and currently_occupied:
        rec = f"Room likely to become empty in ~{HORIZON_MINS} min. Prepare to reduce load."
        action = "PREPARE_CUTOFF"
    elif not will_be_occupied and not currently_occupied:
        rec = "Room predicted to remain empty. Confirm wastage and cut power."
        action = "CUT_NOW"
    elif will_be_occupied and has_wastage:
        rec = "Student returning soon. Restore appliances before arrival."
        action = "RESTORE"
    else:
        rec = "Room operating normally. No action needed."
        action = "NONE"

    return {
        "roomId":          room_id,
        "method":          "lstm",
        "willBeOccupied":  will_be_occupied,
        "confidence":      round(prob * 100, 1) if will_be_occupied
                           else round((1 - prob) * 100, 1),
        "rawProbability":  round(prob, 4),
        "horizonMinutes":  HORIZON_MINS,
        "currentlyOccupied": currently_occupied,
        "recommendation":  rec,
        "action":          action
    }

def predict_all_rooms(rooms_data):
    """
    Run predictions for all rooms. Returns summary.
    """
    predictions = {}
    rooms_going_empty   = []
    rooms_returning     = []
    proactive_savings_w = 0

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            pred = predict_room(room_id, room)
            predictions[room_id] = pred

            if pred.get("action") in ("PREPARE_CUTOFF", "CUT_NOW"):
                rooms_going_empty.append(room_id)
                proactive_savings_w += room.get("power", 0)

            if pred.get("action") == "RESTORE":
                rooms_returning.append(room_id)

    return {
        "predictions":         predictions,
        "roomsGoingEmpty":     rooms_going_empty,
        "roomsReturning":      rooms_returning,
        "proactiveSavings_W":  proactive_savings_w,
        "proactiveSavings_kWh_day": round(
            proactive_savings_w * 18 / 1000, 3)
    }

if __name__ == "__main__":
    # Quick test
    test_state = {
        "temperature": 31.0,
        "co2": 420,
        "light": 1,
        "fan": 1,
        "power": 115,
        "occupancy": 0,
        "inferredOccupancy": "EMPTY",
        "wastage": True
    }
    print("\nTest prediction:")
    result = predict_room("G1-R01", test_state)
    print(json.dumps(result, indent=2))