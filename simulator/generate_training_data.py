# ============================================================
# TRAINING DATA GENERATOR FOR LSTM OCCUPANCY PREDICTOR
# Generates labeled time-series dataset from simulator logic
# No external data needed — uses same behavioural model
# ============================================================

import pandas as pd
import numpy as np
import random
import json
import os
from datetime import datetime, timedelta

# Import our existing parameters
import sys
sys.path.insert(0, os.path.dirname(__file__))
from indian_parameters import OCCUPANCY_PROBABILITY

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── Jaipur monthly temperature (IMD) ─────────────────────────
MONTHLY_TEMP = {
    1:15, 2:18, 3:24, 4:30, 5:35, 6:33,
    7:30, 8:29, 9:29, 10:26, 11:20, 12:15
}

HOURLY_OFFSET = {
    0:-3,1:-4,2:-4,3:-5,4:-5,5:-4,6:-2,7:0,
    8:2,9:4,10:5,11:6,12:6,13:6,14:5,15:4,
    16:3,17:1,18:0,19:-1,20:-2,21:-2,22:-3,23:-3
}

def simulate_room_sequence(days=60, interval_minutes=5):
    """
    Simulate one room for N days at given interval.
    Returns a DataFrame with features + label.
    interval_minutes: how often sensor sends data
    """
    records = []
    start   = datetime(2026, 1, 1, 0, 0, 0)
    steps   = int(days * 24 * 60 / interval_minutes)

    occupancy = 0
    co2       = 400.0
    
    for step in range(steps):
        ts   = start + timedelta(minutes=step * interval_minutes)
        hour = ts.hour
        dow  = ts.weekday()   # 0=Mon, 6=Sun
        month= ts.month

        # ── Occupancy (memory-based) ──────────────────────────
        target = OCCUPANCY_PROBABILITY[hour]
        # Weekend adjustment: students more likely in room
        if dow >= 5:
            target = min(1.0, target * 1.3)

        if occupancy == 1:
            occupancy = 1 if random.random() < 0.92 else 0
        else:
            occupancy = 1 if random.random() < target * 0.5 else 0

        # ── Temperature ───────────────────────────────────────
        base  = MONTHLY_TEMP[month] + HOURLY_OFFSET[hour]
        temp  = round(base + (1.5 if occupancy else 0)
                      + random.uniform(-0.3, 0.3), 1)

        # ── CO2 ──────────────────────────────────────────────
        if occupancy:
            co2 = min(co2 + random.randint(15, 45), 1200)
        else:
            co2 = max(co2 - random.randint(10, 25), 400)
        co2 = round(co2)

        # ── Appliances ───────────────────────────────────────
        if occupancy:
            light = 1 if random.random() < 0.85 else 0
            fan   = 1 if (temp > 28 and random.random() < 0.80) \
                      else (1 if random.random() < 0.40 else 0)
        else:
            light = 1 if random.random() < 0.25 else 0
            fan   = 1 if random.random() < 0.15 else 0

        power = (75 if fan else 0) + (40 if light else 0)

        records.append({
            "timestamp":  ts.isoformat(),
            "hour":       hour,
            "dow":        dow,          # day of week
            "month":      month,
            "temperature":temp,
            "co2":        co2,
            "light":      light,
            "fan":        fan,
            "power":      power,
            "occupancy":  occupancy     # TARGET LABEL
        })

    return pd.DataFrame(records)


def generate_dataset(rooms=20, days=60):
    """Generate data for multiple rooms and combine."""
    all_dfs = []
    print(f"Generating {days}-day dataset for {rooms} rooms...")
    for r in range(rooms):
        df = simulate_room_sequence(days=days)
        df["room_id"] = r
        all_dfs.append(df)
        print(f"  Room {r+1}/{rooms} done — {len(df)} timesteps")

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal records: {len(combined):,}")
    print(f"Occupancy rate: {combined['occupancy'].mean()*100:.1f}%")
    return combined


if __name__ == "__main__":
    df = generate_dataset(rooms=20, days=60)
    out = os.path.join(os.path.dirname(__file__), "training_data.csv")
    df.to_csv(out, index=False)
    print(f"\n✅ Saved to {out}")
    print(df.head(10).to_string())