# ============================================================
# STRATEGY SIMULATION ENGINE
# The research core of the Digital Twin system
#
# This module simulates energy management strategies on the
# digital twin and calculates projected savings BEFORE
# any real-world implementation.
#
# This is what separates this system from simple monitoring.
# ============================================================

from indian_parameters import (
    FAN_WATTS, LIGHT_WATTS,
    CEA_EMISSION_FACTOR_KG_PER_KWH,
    RERC_TARIFF_PER_KWH,
    BLOCKS, ROOMS_PER_BLOCK,
    OCCUPANCY_PROBABILITY,
    WASTAGE_PROBABILITY_LIGHT,
    WASTAGE_PROBABILITY_FAN,
    BEE_BENCHMARK_KWH_PER_PERSON_PER_DAY,
    TOTAL_STUDENTS
)
import random

# ============================================================
# STRATEGY DEFINITIONS
# Each strategy has an id, name, description, and type
# ============================================================
STRATEGIES = [
    {
        "id": 1,
        "name": "Empty Room Cutoff",
        "description": (
            "Immediately cut power to fans and lights in all "
            "unoccupied rooms. Appliances are turned off as soon "
            "as a room is detected empty."
        ),
        "type": "occupancy",
        "beeAligned": True
    },
    {
        "id": 2,
        "name": "Night Mode (11PM - 5AM)",
        "description": (
            "Reduce all fans to low speed (35W) between 11PM and "
            "5AM. Lights in common areas switched off. Students "
            "can override manually."
        ),
        "type": "schedule",
        "beeAligned": True
    },
    {
        "id": 3,
        "name": "Temperature-Based Fan Control",
        "description": (
            "Fan runs only when room temperature exceeds 28°C. "
            "Below threshold, fan is auto-switched off. Based on "
            "ASHRAE 55 thermal comfort standard."
        ),
        "type": "threshold",
        "beeAligned": True
    },
    {
        "id": 4,
        "name": "Combined Optimisation",
        "description": (
            "Applies all three strategies simultaneously: "
            "empty room cutoff + night mode + temperature control. "
            "Maximum possible energy reduction."
        ),
        "type": "combined",
        "beeAligned": True
    }
]

# ============================================================
# BASELINE CALCULATOR
# Calculates what the hostel currently consumes
# without any strategy applied
# ============================================================
def calculate_baseline(rooms_data):
    """
    Calculate current energy consumption from live digital twin data.
    rooms_data: dict of all room states from backend
    Returns: dict with energy, carbon, cost metrics
    """
    total_power_w = 0
    wastage_power_w = 0
    wastage_rooms = []
    block_power = {b: 0 for b in BLOCKS}

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            power = room.get("power", 0)
            total_power_w += power
            block_power[block] += power

            if room.get("wastage", False):
                wastage_power_w += power
                wastage_rooms.append(room_id)

    # Project to annual figures
    # Assume average daily run = 18 hours
    # (realistic for hostel — not 24hr)
    daily_hours = 18
    annual_days = 365

    baseline_kwh_day  = (total_power_w * daily_hours) / 1000
    baseline_kwh_year = baseline_kwh_day * annual_days

    wastage_kwh_day   = (wastage_power_w * daily_hours) / 1000
    wastage_kwh_year  = wastage_kwh_day * annual_days

    return {
        "totalPower_W":       round(total_power_w, 2),
        "wastagePower_W":     round(wastage_power_w, 2),
        "wastageRooms":       wastage_rooms,
        "wastageRoomCount":   len(wastage_rooms),

        "baseline_kWh_day":   round(baseline_kwh_day, 3),
        "baseline_kWh_year":  round(baseline_kwh_year, 2),

        "wastage_kWh_day":    round(wastage_kwh_day, 3),
        "wastage_kWh_year":   round(wastage_kwh_year, 2),

        "carbon_kg_day":      round(baseline_kwh_day  * CEA_EMISSION_FACTOR_KG_PER_KWH, 3),
        "carbon_kg_year":     round(baseline_kwh_year * CEA_EMISSION_FACTOR_KG_PER_KWH, 2),

        "cost_inr_day":       round(baseline_kwh_day  * RERC_TARIFF_PER_KWH, 2),
        "cost_inr_year":      round(baseline_kwh_year * RERC_TARIFF_PER_KWH, 2),

        "blockPower_W":       block_power,

        # BEE compliance check
        "beeCompliant":       (baseline_kwh_day / TOTAL_STUDENTS) 
                               <= BEE_BENCHMARK_KWH_PER_PERSON_PER_DAY
    }

# ============================================================
# STRATEGY 1 — EMPTY ROOM CUTOFF
# ============================================================
def simulate_strategy_1(rooms_data):
    """
    Simulates: cut all power in empty rooms immediately.
    Calculates how much is saved vs baseline.
    """
    optimised_power_w = 0
    block_power = {b: 0 for b in BLOCKS}

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            occupied = room.get("inferredOccupancy", "EMPTY") == "OCCUPIED" \
                       or room.get("occupancy", 0) == 1

            if occupied:
                # Keep appliances as they are
                power = room.get("power", 0)
            else:
                # Cut everything — this is the strategy
                power = 0

            optimised_power_w += power
            block_power[block] += power

    return optimised_power_w, block_power

# ============================================================
# STRATEGY 2 — NIGHT MODE (11PM - 5AM)
# ============================================================
def simulate_strategy_2(rooms_data):
    """
    Simulates: reduce fan to low speed (35W) during night hours.
    Night hours defined as 23:00 to 05:00.
    Applies to ALL rooms regardless of occupancy.
    """
    NIGHT_FAN_WATTS = 35  # BEE 5-star fan at low speed

    optimised_power_w = 0
    block_power = {b: 0 for b in BLOCKS}

    # Calculate weighted average across all 24 hours
    # Night hours: 23, 0, 1, 2, 3, 4, 5 = 7 hours
    # Day hours: 6-22 = 17 hours
    night_hours = [23, 0, 1, 2, 3, 4, 5]
    night_fraction = len(night_hours) / 24  # 0.292

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            current_power = room.get("power", 0)
            fan_on = room.get("fan", 0) == 1

            # During night: fan runs at 35W instead of 75W
            if fan_on:
                saving_per_night_hour = FAN_WATTS - NIGHT_FAN_WATTS  # 40W saved
                # Weighted saving across 24 hours
                weighted_saving = saving_per_night_hour * night_fraction
                optimised_power = current_power - weighted_saving
            else:
                optimised_power = current_power

            optimised_power = max(0, optimised_power)
            optimised_power_w += optimised_power
            block_power[block] += optimised_power

    return optimised_power_w, block_power

# ============================================================
# STRATEGY 3 — TEMPERATURE BASED FAN CONTROL
# ============================================================
def simulate_strategy_3(rooms_data):
    """
    Simulates: fan only runs when temperature > 28°C.
    Based on ASHRAE 55 thermal comfort standard for India.
    Threshold: 28°C (NBC India 2016 recommended setpoint)
    """
    TEMP_THRESHOLD = 28.0  # °C

    optimised_power_w = 0
    block_power = {b: 0 for b in BLOCKS}

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            temp = room.get("temperature", 30)
            fan_on = room.get("fan", 0) == 1
            light_on = room.get("light", 0) == 1

            # Fan only justified above threshold
            if fan_on and temp <= TEMP_THRESHOLD:
                fan_power = 0   # turn off — not needed
            else:
                fan_power = FAN_WATTS if fan_on else 0

            light_power = LIGHT_WATTS if light_on else 0
            optimised_power = fan_power + light_power

            optimised_power_w += optimised_power
            block_power[block] += optimised_power

    return optimised_power_w, block_power

# ============================================================
# STRATEGY 4 — COMBINED OPTIMISATION
# ============================================================
def simulate_strategy_4(rooms_data):
    """
    Applies all 3 strategies simultaneously.
    Maximum energy reduction scenario.
    """
    NIGHT_FAN_WATTS = 35
    TEMP_THRESHOLD  = 28.0
    night_fraction  = 7 / 24

    optimised_power_w = 0
    block_power = {b: 0 for b in BLOCKS}

    for block, rooms in rooms_data.items():
        for room_id, room in rooms.items():
            occupied = room.get("inferredOccupancy", "EMPTY") == "OCCUPIED" \
                       or room.get("occupancy", 0) == 1
            temp     = room.get("temperature", 30)
            fan_on   = room.get("fan", 0) == 1
            light_on = room.get("light", 0) == 1

            # Strategy 1: empty room → zero power
            if not occupied:
                optimised_power_w += 0
                continue

            # Strategy 3: temp check for fan
            if fan_on and temp <= TEMP_THRESHOLD:
                fan_power = 0
            else:
                # Strategy 2: night mode reduction
                if fan_on:
                    saving = (FAN_WATTS - NIGHT_FAN_WATTS) * night_fraction
                    fan_power = FAN_WATTS - saving
                else:
                    fan_power = 0

            light_power = LIGHT_WATTS if light_on else 0
            optimised_power = max(0, fan_power + light_power)

            optimised_power_w += optimised_power
            block_power[block] += optimised_power

    return optimised_power_w, block_power

# ============================================================
# MAIN SIMULATION RUNNER
# Called by the backend API when warden clicks "Run Simulation"
# ============================================================
def run_simulation(strategy_id, rooms_data, baseline):
    """
    Runs the selected strategy simulation.
    Returns full result dict for the frontend to display.
    """
    daily_hours  = 18
    annual_days  = 365

    # Select and run the correct strategy
    strategy_map = {
        1: simulate_strategy_1,
        2: simulate_strategy_2,
        3: simulate_strategy_3,
        4: simulate_strategy_4
    }

    if strategy_id not in strategy_map:
        return {"error": "Invalid strategy ID"}

    strategy_info = STRATEGIES[strategy_id - 1]
    optimised_power_w, block_power = strategy_map[strategy_id](rooms_data)

    # Calculate optimised annual figures
    optimised_kwh_day  = (optimised_power_w * daily_hours) / 1000
    optimised_kwh_year = optimised_kwh_day * annual_days

    # Calculate savings vs baseline
    saved_kwh_day  = baseline["baseline_kWh_day"]  - optimised_kwh_day
    saved_kwh_year = baseline["baseline_kWh_year"] - optimised_kwh_year

    saved_carbon_year = saved_kwh_year * CEA_EMISSION_FACTOR_KG_PER_KWH
    saved_cost_year   = saved_kwh_year * RERC_TARIFF_PER_KWH

    reduction_pct = (saved_kwh_year / baseline["baseline_kWh_year"] * 100) \
                     if baseline["baseline_kWh_year"] > 0 else 0

    # Block wise savings
    block_savings = {}
    for block in BLOCKS:
        b_baseline_w   = baseline["blockPower_W"].get(block, 0)
        b_optimised_w  = block_power.get(block, 0)
        b_saved_w      = b_baseline_w - b_optimised_w
        b_saved_kwh_yr = (b_saved_w * daily_hours * annual_days) / 1000

        block_savings[block] = {
            "baselinePower_W":   round(b_baseline_w, 2),
            "optimisedPower_W":  round(b_optimised_w, 2),
            "savedPower_W":      round(b_saved_w, 2),
            "savedEnergy_kWh_year": round(b_saved_kwh_yr, 2)
        }

    # Recommendation logic
    if reduction_pct >= 20:
        recommendation = "STRONGLY RECOMMENDED"
        rec_reason = "High impact. Significant energy and carbon reduction."
    elif reduction_pct >= 10:
        recommendation = "RECOMMENDED"
        rec_reason = "Moderate impact. Good balance of savings and comfort."
    elif reduction_pct >= 5:
        recommendation = "CONSIDER"
        rec_reason = "Low impact. Useful as supplementary measure."
    else:
        recommendation = "LOW IMPACT"
        rec_reason = "Minimal savings detected under current conditions."

    return {
        "strategyId":          strategy_id,
        "strategyName":        strategy_info["name"],
        "strategyDescription": strategy_info["description"],
        "strategyType":        strategy_info["type"],

        # Baseline
        "baseline_kWh_year":   baseline["baseline_kWh_year"],
        "baseline_carbon_year": baseline["carbon_kg_year"],
        "baseline_cost_year":  baseline["cost_inr_year"],

        # Optimised
        "optimised_kWh_year":  round(optimised_kwh_year, 2),
        "optimised_carbon_year": round(
            optimised_kwh_year * CEA_EMISSION_FACTOR_KG_PER_KWH, 2),
        "optimised_cost_year": round(
            optimised_kwh_year * RERC_TARIFF_PER_KWH, 2),

        # Savings
        "saved_kWh_year":      round(saved_kwh_year, 2),
        "saved_carbon_year":   round(saved_carbon_year, 2),
        "saved_cost_inr_year": round(saved_cost_year, 2),
        "reduction_pct":       round(reduction_pct, 1),

        # Block breakdown
        "blockSavings":        block_savings,

        # Recommendation
        "recommendation":      recommendation,
        "recommendationReason": rec_reason,

        # Compliance
        "beeCompliant":        baseline["beeCompliant"],

        # Sources cited
        "dataSources": [
            "CEA India Grid Emission Factor 2023: 0.82 kg CO2/kWh",
            "RERC Institutional Tariff 2023-24: ₹8/kWh",
            "BEE Hostel Energy Benchmark: 15-25 kWh/person/month",
            "ASHRAE 55 Thermal Comfort Standard",
            "NBC India 2016: Temperature threshold 28°C"
        ]
    }