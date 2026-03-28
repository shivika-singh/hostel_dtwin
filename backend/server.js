const express = require("express");
const cors = require("cors");

const energyAnalytics = require("./services/energyAnalytics");

const digitalTwin = require("./digitalTwinState");
const calculatePower = require("./services/energyCalculator");
const inferRoomState = require("./services/sensorFusion");
const { startLogging } = require("./dataLogger");
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
// ── SMART ALERT LOGIC ──────────────────────────────────────
// Rule 1: Only alert wastage when room is EMPTY
// Rule 2: Never alert occupied rooms for normal appliance use
// Rule 3: Alert on electrical overload for fire safety

const SAFE_BLOCK_LOAD_W = 1200;  // IE Rules 1956 safe limit
let blockLoad = 0;

Object.entries(digitalTwin.blocks[block].rooms).forEach(([id, r]) => {
  blockLoad += r.power || 0;

  // WASTAGE ALERT — only when room is empty
  if (r.wastage && !r.occupancy) {
    const existing = alarmHistory.find(
      a => a.room === id && a.type === "WASTAGE" && !a.acknowledged
    );
    if (!existing) {
      const alarm = {
        block,
        room: id,
        type: "WASTAGE",
        message: `Empty room ${id}: appliances left ON (${r.power}W wasted)`,
        severity: "WARNING",
        wattageWasted: r.power,
        time: new Date().toISOString(),
        acknowledged: false
      };
      digitalTwin.blocks[block].alerts.push(alarm.message);
      alarmHistory.push(alarm);
    }
  }

  // CO2 AIR QUALITY ALERT — occupied room with poor air
  if (r.occupancy && r.co2 > 1000) {
    const alarm = {
      block,
      room: id,
      type: "AIR_QUALITY",
      message: `Room ${id}: CO2 at ${r.co2}ppm. Open window or increase ventilation.`,
      severity: "WARNING",
      co2Level: r.co2,
      time: new Date().toISOString(),
      acknowledged: false
    };
    alarmHistory.push(alarm);
  }
});

// ELECTRICAL OVERLOAD ALERT — fire safety
const loadPercent = (blockLoad / SAFE_BLOCK_LOAD_W) * 100;

if (loadPercent >= 100) {
  alarmHistory.push({
    block,
    room: "BLOCK-LEVEL",
    type: "EMERGENCY",
    message: `⚡ EMERGENCY: Block ${block} has EXCEEDED safe load limit (${blockLoad}W / ${SAFE_BLOCK_LOAD_W}W). Electrical hazard risk. Immediate action required.`,
    severity: "EMERGENCY",
    loadW: blockLoad,
    loadPercent: Math.round(loadPercent),
    time: new Date().toISOString(),
    acknowledged: false
  });
} else if (loadPercent >= 95) {
  alarmHistory.push({
    block,
    room: "BLOCK-LEVEL",
    type: "CRITICAL",
    message: `🔴 CRITICAL: Block ${block} at ${Math.round(loadPercent)}% of safe electrical load (${blockLoad}W). Cut non-essential load now.`,
    severity: "CRITICAL",
    loadW: blockLoad,
    loadPercent: Math.round(loadPercent),
    time: new Date().toISOString(),
    acknowledged: false
  });
} else if (loadPercent >= 80) {
  const existing = alarmHistory.find(
    a => a.block === block && a.type === "WARNING_LOAD" &&
    (Date.now() - new Date(a.time).getTime()) < 300000
  );
  if (!existing) {
    alarmHistory.push({
      block,
      room: "BLOCK-LEVEL",
      type: "WARNING_LOAD",
      message: `🟡 WARNING: Block ${block} at ${Math.round(loadPercent)}% of safe electrical load (${blockLoad}W). Monitor closely.`,
      severity: "WARNING",
      loadW: blockLoad,
      loadPercent: Math.round(loadPercent),
      time: new Date().toISOString(),
      acknowledged: false
    });
  }
}


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
    icon: "🚫",
    beeAligned: true
  },
  {
    id: 2,
    name: "Night Mode (11PM - 5AM)",
    description: "Reduce all fans to low speed (35W) between 11PM and 5AM.",
    type: "schedule",
    icon: "🌙",
    beeAligned: true
  },
  {
    id: 3,
    name: "Temperature-Based Fan Control",
    description: "Fan runs only when room temperature exceeds 28°C (ASHRAE 55).",
    type: "threshold",
    icon: "🌡️",
    beeAligned: true
  },
  {
    id: 4,
    name: "Combined Optimisation",
    description: "Applies strategies 1+2+3 simultaneously for maximum reduction.",
    type: "combined",
    icon: "⚡",
    beeAligned: true
  },
  {
    id: 5,
    name: "Vacancy Timeout (10-Minute Rule)",
    description: "Cut power only after room has been empty for 10 continuous minutes. Prevents false cutoffs when student briefly steps out.",
    type: "occupancy_timeout",
    icon: "⏱️",
    beeAligned: true
  },
  {
    id: 6,
    name: "Electrical Load Balancing",
    description: "Cap each block at 80% of safe load limit (IE Rules 1956). Prevents overload, short circuits, and fire risk by shedding non-essential load first.",
    type: "safety",
    icon: "🔌",
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

  const pythonPath = path.join(__dirname, "../simulator/venv/Scripts/python.exe");
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
// GET context-aware strategy suggestions
app.get("/suggest-strategies", (req, res) => {
  const roomsData = {};
  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    roomsData[block] = data.rooms;
  });

  const tempInput = path.join(__dirname, "../simulator/temp_suggest.json");
  const tempOutput = path.join(__dirname, "../simulator/temp_suggestion_result.json");

  fs.writeFileSync(tempInput, JSON.stringify({ roomsData }, null, 2));

  const pythonPath = path.join(__dirname, "../simulator/venv/bin/python3");
  const scriptPath = path.join(__dirname, "../simulator/run_suggestion.py");

  execFile(pythonPath, [scriptPath], { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: "Suggestion failed", detail: stderr });
    try {
      const result = JSON.parse(fs.readFileSync(tempOutput, "utf8"));
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Could not parse suggestion result" });
    }
  });
});

// POST apply strategy to Digital Twin (preview mode)
app.post("/apply-strategy", (req, res) => {
  const { strategyId } = req.body;
  if (!strategyId) return res.status(400).json({ error: "strategyId required" });

  // Mark strategy as applied in DT — does NOT deploy to real system
  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    Object.entries(data.rooms).forEach(([roomId, room]) => {
      if (strategyId === 1 && !room.occupancy) {
        room.light = 0;
        room.fan = 0;
        room.power = 0;
        room.wastage = false;
      }
      if (strategyId === 2) {
        if (room.fan === 1) room.power = 35 + (room.light ? 40 : 0);
      }
    });
  });

  digitalTwin.appliedStrategy = { strategyId, appliedAt: new Date().toISOString(), status: "PREVIEW" };
  res.json({ success: true, message: "Strategy applied to Digital Twin in preview mode", strategyId });
});

// POST deploy strategy — warden approves and commits
app.post("/deploy-strategy", (req, res) => {
  const { strategyId } = req.body;
  if (!strategyId) return res.status(400).json({ error: "strategyId required" });

  digitalTwin.appliedStrategy = {
    strategyId,
    deployedAt: new Date().toISOString(),
    status: "DEPLOYED",
    deployedBy: "WARDEN"
  };

  res.json({
    success: true,
    message: `Strategy ${strategyId} deployed as active hostel energy policy`,
    deployedAt: digitalTwin.appliedStrategy.deployedAt
  });
});
/* =======================
   START SERVER
======================= */

app.listen(5001, () => {
  console.log("Server running on port 5001");
  startLogging(digitalTwin);  // ← add this line
});