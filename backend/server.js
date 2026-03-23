const express = require("express");
const cors = require("cors");

const energyAnalytics = require("./services/energyAnalytics");

const digitalTwin = require("./digitalTwinState");
const calculatePower = require("./services/energyCalculator");
const inferRoomState = require("./services/sensorFusion");

const alarmHistory = [];

const app = express();
app.use(cors());
app.use(express.json());

/* =======================
   DIGITAL TWIN READ API
======================= */
app.get("/digitalTwinState", (req, res) => {
  res.json({
    blocks: digitalTwin.blocks,
    timestamp: new Date().toISOString()
  });
});

/* =======================
   ALARM APIs
======================= */

app.get("/alarms", (req, res) => {
  res.json(alarmHistory.slice(-50));
});

app.post("/alarms/acknowledge", (req, res) => {
  const { index } = req.body;

  if (alarmHistory[index]) {
    alarmHistory[index].acknowledged = true;
  }

  res.json({ status: "acknowledged" });
});

/* =======================
   SIMULATOR → DT UPDATE
======================= */

app.post("/simulator/update", (req, res) => {
  const { block, room, occupancy, temperature, co2, light, fan } = req.body;

  if (!digitalTwin.blocks[block]) {
    return res.status(400).json({ error: "Invalid block" });
  }

  const roomId = `${block}-${room}`;
  const roomState = digitalTwin.blocks[block].rooms[roomId];

  if (!roomState) {
    return res.status(400).json({ error: "Invalid room" });
  }

  /* 1️⃣ Update raw sensor state */

  roomState.occupancy = occupancy;
  roomState.temperature = temperature;
  roomState.co2 = co2;
  roomState.light = light;
  roomState.fan = fan;
  roomState.power = calculatePower(light, fan);
  roomState.lastUpdated = Date.now();

  /* 2️⃣ Sensor fusion */

  const fusion = inferRoomState(roomState);

  roomState.inferredOccupancy = fusion.inferredOccupancy;
  roomState.wastage = fusion.wastage;

  /* 3️⃣ Recalculate block energy */

  let blockPower = 0;

  Object.values(digitalTwin.blocks[block].rooms).forEach(r => {
    blockPower += r.power;
  });

  digitalTwin.blocks[block].energy.currentLoad = blockPower;

  digitalTwin.blocks[block].energy.totalEnergy += blockPower * (2 / 3600);

  energyAnalytics.updateEnergy(block, blockPower, fusion.wastage);

  /* 4️⃣ Alert generation */

  if (!digitalTwin.blocks[block].alerts) {
    digitalTwin.blocks[block].alerts = [];
  }

  Object.entries(digitalTwin.blocks[block].rooms).forEach(([id, r]) => {

    if (r.wastage) {

      const alarm = {
        block,
        room: id,
        message: `Energy wastage detected in ${id}`,
        severity: "WARNING",
        time: new Date().toISOString(),
        acknowledged: false
      };

      digitalTwin.blocks[block].alerts.push(alarm.message);

      alarmHistory.push(alarm);

    }

  });

  res.json({ status: "Digital Twin updated" });

});

/* =======================
   WARDEN DASHBOARD SUMMARY
======================= */

app.get("/wardenSummary", (req, res) => {

  const summary = {};

  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {

    const rooms = Object.values(data.rooms);

    const occupiedCount = rooms.filter(
      r => r.inferredOccupancy === "OCCUPIED"
    ).length;

    const wastageCount = rooms.filter(
      r => r.wastage
    ).length;

    summary[block] = {

      occupiedRooms: occupiedCount,

      totalRooms: rooms.length,

      currentLoad_W: data.energy.currentLoad,

      energyToday_Wh: data.energy.totalEnergy,

      energyToday_kWh: (data.energy.totalEnergy / 1000).toFixed(3),

      wastageRooms: wastageCount,

      alerts: data.alerts

    };

  });

  res.json(summary);

});

/* =======================
   ENERGY ANALYTICS
======================= */

app.get("/testEnergy/:block", (req, res) => {

  res.json(
    energyAnalytics.getBlockAnalytics(req.params.block)
  );

});

app.get("/energyAnalytics/:block", (req, res) => {

  const block = req.params.block;

  res.json(
    energyAnalytics.getBlockAnalytics(block)
  );

});

/* =======================
   CONTROL LOGIC
======================= */

app.post("/control/room", (req, res) => {

  const { block, room, light, fan } = req.body;

  if (!digitalTwin.blocks[block]) {
    return res.status(400).json({ error: "Invalid block" });
  }

  const roomId = `${block}-${room}`;

  const roomState = digitalTwin.blocks[block].rooms[roomId];

  if (!roomState) {
    return res.status(400).json({ error: "Invalid room" });
  }

  if (
    roomState.inferredOccupancy === "EMPTY" &&
    (light === 1 || fan === 1)
  ) {

    return res.status(403).json({
      error: "Cannot turn ON appliances in empty room"
    });

  }

  roomState.light = light;

  roomState.fan = fan;

  roomState.power = calculatePower(light, fan);

  res.json({ status: "Control applied" });

});
/* =======================
   SIMULATION ENGINE API
======================= */
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

// GET all available strategies
app.get("/strategies", (req, res) => {
  const strategies = [
    {
      id: 1,
      name: "Empty Room Cutoff",
      description: "Immediately cut power to fans and lights in all unoccupied rooms.",
      type: "occupancy",
      beeAligned: true
    },
    {
      id: 2,
      name: "Night Mode (11PM - 5AM)",
      description: "Reduce all fans to low speed (35W) between 11PM and 5AM.",
      type: "schedule",
      beeAligned: true
    },
    {
      id: 3,
      name: "Temperature-Based Fan Control",
      description: "Fan runs only when room temperature exceeds 28°C (ASHRAE 55).",
      type: "threshold",
      beeAligned: true
    },
    {
      id: 4,
      name: "Combined Optimisation",
      description: "Applies all three strategies simultaneously for maximum reduction.",
      type: "combined",
      beeAligned: true
    }
  ];
  res.json(strategies);
});

// POST run simulation for a selected strategy
app.post("/simulate", (req, res) => {
  const { strategyId } = req.body;

  if (!strategyId || strategyId < 1 || strategyId > 4) {
    return res.status(400).json({ error: "Invalid strategy ID. Must be 1-4." });
  }

  const roomsData = {};
  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    roomsData[block] = data.rooms;
  });

  const tempInput  = path.join(__dirname, "../simulator/temp_rooms.json");
  const tempOutput = path.join(__dirname, "../simulator/temp_result.json");

  fs.writeFileSync(tempInput, JSON.stringify({ strategyId, roomsData }, null, 2));

  const pythonPath = path.join(__dirname, "../simulator/venv/bin/python3");
  const scriptPath = path.join(__dirname, "../simulator/run_simulation.py");

  execFile(pythonPath, [scriptPath], { timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("Simulation error:", stderr);
      return res.status(500).json({ error: "Simulation failed", detail: stderr });
    }
    try {
      const result = JSON.parse(fs.readFileSync(tempOutput, "utf8"));
      res.json(result);
    } catch (parseErr) {
      res.status(500).json({ error: "Could not parse simulation result" });
    }
  });
});

// GET baseline analytics with carbon and cost
app.get("/baseline", (req, res) => {
  let totalPower   = 0;
  let wastagePower = 0;
  const wastageRooms = [];
  const blockPower   = {};

  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    blockPower[block] = 0;
    Object.entries(data.rooms).forEach(([roomId, room]) => {
      const power = room.power || 0;
      totalPower += power;
      blockPower[block] += power;
      if (room.wastage) {
        wastagePower += power;
        wastageRooms.push(roomId);
      }
    });
  });

  const dailyHours = 18;
  const annualDays = 365;
  const CEA  = 0.82;
  const RERC = 8.0;

  const kwhDay  = (totalPower  * dailyHours) / 1000;
  const kwhYear = kwhDay * annualDays;
  const wastageKwhYear = ((wastagePower * dailyHours) / 1000) * annualDays;

  const r = (v) => Math.round(v * 100) / 100;

  res.json({
    totalPower_W:      r(totalPower),
    wastagePower_W:    r(wastagePower),
    wastageRooms,
    wastageRoomCount:  wastageRooms.length,
    baseline_kWh_day:  r(kwhDay),
    baseline_kWh_year: r(kwhYear),
    wastage_kWh_year:  r(wastageKwhYear),
    carbon_kg_day:     r(kwhDay  * CEA),
    carbon_kg_year:    r(kwhYear * CEA),
    cost_inr_day:      r(kwhDay  * RERC),
    cost_inr_year:     r(kwhYear * RERC),
    blockPower_W:      blockPower,
    sources: {
      emissionFactor: "CEA India 2023 — 0.82 kg CO2/kWh",
      tariff:         "RERC Institutional Tariff 2023-24 — ₹8/kWh",
      benchmark:      "BEE Hostel Benchmark — 15-25 kWh/person/month"
    }
  });
});
/* =======================
   START SERVER
======================= */

app.listen(5001, () => {
  console.log("Server running on port 5001");
});