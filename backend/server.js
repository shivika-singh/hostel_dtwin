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
   START SERVER
======================= */

app.listen(5000, () => {

  console.log("Server running on port 5000");

});