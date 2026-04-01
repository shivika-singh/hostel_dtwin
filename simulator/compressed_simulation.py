# ============================================================
# COMPRESSED TIME SIMULATION
# 1 loop iteration = 1 simulated hour
# Runs 30 days × 24 hours = 720 iterations per strategy
# Generates real paper results without waiting weeks
#
# Standard methodology in simulation research
# (Same approach as Gao et al. 2019 using TRNSYS)
# ============================================================

import random
import json
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from indian_parameters import (
    BLOCKS, ROOMS_PER_BLOCK,
    OCCUPANCY_PROBABILITY,
    WASTAGE_PROBABILITY_LIGHT,
    WASTAGE_PROBABILITY_FAN,
    CO2_NORMAL, CO2_HIGH,
    FAN_WATTS, LIGHT_WATTS,
    CEA_EMISSION_FACTOR_KG_PER_KWH,
    RERC_TARIFF_PER_KWH,
    TOTAL_ROOMS, TOTAL_STUDENTS,
    BEE_BENCHMARK_KWH_PER_PERSON_PER_DAY
)

# ============================================================
# JAIPUR MONTHLY TEMPERATURE (IMD Data)
# Used for time-compressed simulation across seasons
# ============================================================
JAIPUR_MONTHLY_AVG_TEMP = {
    1: 15.0, 2: 18.0, 3: 24.0, 4: 30.0,
    5: 35.0, 6: 33.0, 7: 30.0, 8: 29.0,
    9: 29.0, 10: 26.0, 11: 20.0, 12: 15.0
}

JAIPUR_HOURLY_OFFSET = {
    0: -3, 1: -4, 2: -4, 3: -5, 4: -5, 5: -4,
    6: -2, 7: 0, 8: 2, 9: 4, 10: 5, 11: 6,
    12: 6, 13: 6, 14: 5, 15: 4, 16: 3, 17: 1,
    18: 0, 19: -1, 20: -2, 21: -2, 22: -3, 23: -3
}

SIMULATION_DAYS = 30
SAFE_BLOCK_LOAD_W = 1200

# ============================================================
# ROOM STATE FOR ONE HOUR
# ============================================================
def simulate_room_hour(prev_occ, hour, month, strategy_id):
    """Simulate one room for one hour under a given strategy."""

    # Occupancy
    target_prob = OCCUPANCY_PROBABILITY[hour]
    if prev_occ == 1:
        occupancy = 1 if random.random() < 0.90 else 0
    else:
        occupancy = 1 if random.random() < target_prob * 0.5 else 0

    # Temperature — monthly average + hourly offset + body heat
    base_temp = JAIPUR_MONTHLY_AVG_TEMP[month]
    hourly_offset = JAIPUR_HOURLY_OFFSET[hour]
    body_heat = 1.5 if occupancy else 0
    temperature = round(base_temp + hourly_offset + body_heat +
                        random.uniform(-0.3, 0.3), 1)

    # CO2
    if occupancy:
        co2 = min(CO2_NORMAL + random.randint(200, 500), CO2_HIGH)
    else:
        co2 = CO2_NORMAL + random.randint(0, 50)

    # Raw appliance state (before strategy)
    if occupancy:
        light = 1 if random.random() < 0.85 else 0
        fan = 1 if (temperature > 28 and random.random() < 0.80) \
              else (1 if random.random() < 0.40 else 0)
    else:
        light = 1 if random.random() < WASTAGE_PROBABILITY_LIGHT else 0
        fan = 1 if random.random() < WASTAGE_PROBABILITY_FAN else 0

    wastage = (not occupancy) and (light or fan)

    # Apply strategy rules
    if strategy_id == 1:
        # Empty room cutoff
        if not occupancy:
            light, fan = 0, 0
            wastage = False

    elif strategy_id == 2:
        # Night mode — reduce fan speed 11PM-5AM
        if hour >= 23 or hour <= 5:
            if fan:
                # Represented as 35W instead of 75W
                # We handle this in power calculation
                pass

    elif strategy_id == 3:
        # Temperature threshold
        if fan and temperature <= 28:
            fan = 0

    elif strategy_id == 4:
        # Combined
        if not occupancy:
            light, fan = 0, 0
            wastage = False
        elif fan and temperature <= 28:
            fan = 0

    elif strategy_id == 5:
        # Vacancy timeout — 60% confidence cutoff
        if not occupancy and random.random() < 0.60:
            light, fan = 0, 0
            wastage = False

    elif strategy_id == 6:
        # Load balancing handled at block level below
        pass

    # Power calculation
    if strategy_id == 2 and fan and (hour >= 23 or hour <= 5):
        fan_power = 35  # reduced speed
    else:
        fan_power = FAN_WATTS if fan else 0

    light_power = LIGHT_WATTS if light else 0
    power = fan_power + light_power

    return {
        "occupancy": occupancy,
        "temperature": temperature,
        "co2": co2,
        "light": light,
        "fan": fan,
        "power": power,
        "wastage": wastage
    }

# ============================================================
# SIMULATE ONE FULL MONTH UNDER A STRATEGY
# ============================================================
def simulate_month(strategy_id, month=3):
    """
    Simulate 30 days × 24 hours for all 40 rooms.
    Returns hourly energy consumption and wastage data.
    """
    total_energy_kwh = 0
    total_wastage_kwh = 0
    total_wastage_incidents = 0
    peak_load_w = 0
    hourly_loads = []

    # Initial room states
    room_states = {}
    for block in BLOCKS:
        room_states[block] = {}
        for room in range(1, ROOMS_PER_BLOCK + 1):
            room_states[block][room] = {"occupancy": 0}

    for day in range(SIMULATION_DAYS):
        day_month = month  # Could vary month for annual sim
        for hour in range(24):
            hour_power_w = 0
            hour_wastage_w = 0
            block_loads = {b: 0 for b in BLOCKS}

            for block in BLOCKS:
                for room in range(1, ROOMS_PER_BLOCK + 1):
                    prev_occ = room_states[block][room]["occupancy"]
                    state = simulate_room_hour(
                        prev_occ, hour, day_month, strategy_id
                    )
                    room_states[block][room] = state

                    hour_power_w += state["power"]
                    block_loads[block] += state["power"]

                    if state["wastage"]:
                        hour_wastage_w += state["power"]
                        total_wastage_incidents += 1

            # Strategy 6: Load balancing — cap blocks at 80%
            if strategy_id == 6:
                adjusted_power = 0
                for block in BLOCKS:
                    if block_loads[block] > SAFE_BLOCK_LOAD_W * 0.80:
                        adjusted_power += SAFE_BLOCK_LOAD_W * 0.80
                    else:
                        adjusted_power += block_loads[block]
                hour_power_w = adjusted_power

            # Convert W to kWh for this hour (1 hour duration)
            hour_kwh = hour_power_w / 1000
            hour_wastage_kwh = hour_wastage_w / 1000

            total_energy_kwh += hour_kwh
            total_wastage_kwh += hour_wastage_kwh

            if hour_power_w > peak_load_w:
                peak_load_w = hour_power_w

            hourly_loads.append(hour_power_w)

    avg_load_w = sum(hourly_loads) / len(hourly_loads)

    return {
        "strategyId": strategy_id,
        "simulatedDays": SIMULATION_DAYS,
        "totalEnergy_kWh_month": round(total_energy_kwh, 2),
        "totalWastage_kWh_month": round(total_wastage_kwh, 2),
        "totalWastageIncidents": total_wastage_incidents,
        "avgLoad_W": round(avg_load_w, 1),
        "peakLoad_W": round(peak_load_w, 1),
        "carbon_kg_month": round(
            total_energy_kwh * CEA_EMISSION_FACTOR_KG_PER_KWH, 2),
        "cost_inr_month": round(
            total_energy_kwh * RERC_TARIFF_PER_KWH, 2),
        # Annual projections
        "totalEnergy_kWh_year": round(total_energy_kwh * 12, 2),
        "carbon_kg_year": round(
            total_energy_kwh * 12 * CEA_EMISSION_FACTOR_KG_PER_KWH, 2),
        "cost_inr_year": round(
            total_energy_kwh * 12 * RERC_TARIFF_PER_KWH, 2),
        "beeCompliant": (total_energy_kwh / SIMULATION_DAYS / TOTAL_STUDENTS)
                        <= BEE_BENCHMARK_KWH_PER_PERSON_PER_DAY
    }

# ============================================================
# MAIN — Run all strategies and compare
# ============================================================
print("=" * 65)
print("  SMART HOSTEL — COMPRESSED TIME SIMULATION")
print("  30 simulated days per strategy | Jaipur, Rajasthan")
print("  Methodology: 1 iteration = 1 simulated hour")
print("  Based on: Gao et al. 2019 simulation approach")
print("=" * 65)

STRATEGY_NAMES = {
    0: "Baseline (No Strategy)",
    1: "S1: Empty Room Cutoff",
    2: "S2: Night Mode (11PM-5AM)",
    3: "S3: Temperature-Based Fan Control",
    4: "S4: Combined Optimisation",
    5: "S5: Vacancy Timeout (10-min rule)",
    6: "S6: Electrical Load Balancing"
}

results = {}

# Run baseline first
print("\n⏳ Simulating Baseline...")
results[0] = simulate_month(0)
baseline = results[0]
print(f"   ✅ Done — {baseline['totalEnergy_kWh_month']} kWh/month")

# Run all 6 strategies
for sid in range(1, 7):
    print(f"⏳ Simulating {STRATEGY_NAMES[sid]}...")
    results[sid] = simulate_month(sid)
    print(f"   ✅ Done — {results[sid]['totalEnergy_kWh_month']} kWh/month")

# ── RESULTS TABLE ─────────────────────────────────────────
print("\n" + "=" * 65)
print("  RESULTS TABLE (30-Day Simulation)")
print("=" * 65)
print(f"{'Strategy':<35} {'kWh/mo':>8} {'CO₂/mo':>8} {'₹/mo':>8} {'Saved%':>7}")
print("-" * 65)

base_kwh = baseline['totalEnergy_kWh_month']

for sid in range(7):
    r = results[sid]
    kwh = r['totalEnergy_kWh_month']
    co2 = r['carbon_kg_month']
    cost = r['cost_inr_month']
    pct = ((base_kwh - kwh) / base_kwh * 100) if sid > 0 else 0
    name = STRATEGY_NAMES[sid][:34]
    print(f"{name:<35} {kwh:>8.1f} {co2:>8.1f} {cost:>8.0f} {pct:>6.1f}%")

print("-" * 65)

# Best strategy
best_sid = max(range(1, 7),
               key=lambda s: base_kwh - results[s]['totalEnergy_kWh_month'])
best = results[best_sid]
saved_kwh = base_kwh - best['totalEnergy_kWh_month']
saved_pct = saved_kwh / base_kwh * 100

print(f"\n🏆 BEST STRATEGY: {STRATEGY_NAMES[best_sid]}")
print(f"   Monthly energy saved:  {saved_kwh:.1f} kWh")
print(f"   Monthly carbon saved:  {(saved_kwh * CEA_EMISSION_FACTOR_KG_PER_KWH):.1f} kg CO₂")
print(f"   Monthly cost saved:    ₹{(saved_kwh * RERC_TARIFF_PER_KWH):.0f}")
print(f"   Reduction:             {saved_pct:.1f}%")

# Annual projections
print(f"\n📈 ANNUAL PROJECTIONS (best strategy):")
print(f"   Energy saved/year:  {saved_kwh * 12:.1f} kWh")
print(f"   Carbon saved/year:  {saved_kwh * 12 * CEA_EMISSION_FACTOR_KG_PER_KWH:.1f} kg CO₂")
print(f"   Cost saved/year:    ₹{saved_kwh * 12 * RERC_TARIFF_PER_KWH:.0f}")

# BEE compliance
print(f"\n📋 BEE COMPLIANCE:")
for sid in range(7):
    status = "✅ COMPLIANT" if results[sid]['beeCompliant'] else "❌ NON-COMPLIANT"
    print(f"   {STRATEGY_NAMES[sid][:34]}: {status}")

# Save full results to JSON for paper
output = {
    "simulationMetadata": {
        "method": "Compressed time simulation",
        "daysPerStrategy": SIMULATION_DAYS,
        "location": "Jaipur, Rajasthan, India",
        "totalRooms": TOTAL_ROOMS,
        "totalStudents": TOTAL_STUDENTS,
        "emissionFactor": f"{CEA_EMISSION_FACTOR_KG_PER_KWH} kg CO2/kWh (CEA India 2023)",
        "tariff": f"INR {RERC_TARIFF_PER_KWH}/kWh (RERC 2023-24)",
        "generatedAt": datetime.now().isoformat()
    },
    "results": {STRATEGY_NAMES[k]: v for k, v in results.items()}
}

with open("simulation_results.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\n💾 Full results saved to simulation_results.json")
print("=" * 65)
print("  Use these numbers in your paper results section")
print("=" * 65)