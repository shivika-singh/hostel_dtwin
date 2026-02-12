const express = require("express");
const cors = require("cors");

const digitalTwin = require("./digitalTwinState");
const calculatePower = require("./services/energyCalculator");
const inferRoomState = require("./services/sensorFusion");

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

  // 1️⃣ Update raw sensor state
  roomState.occupancy = occupancy;
  roomState.temperature = temperature;
  roomState.co2 = co2;
  roomState.light = light;
  roomState.fan = fan;
  roomState.power = calculatePower(light, fan);
  roomState.lastUpdated = Date.now();

  // 2️⃣ Sensor fusion (INTELLIGENCE)
  const fusion = inferRoomState(roomState);
  roomState.inferredOccupancy = fusion.inferredOccupancy;
  roomState.wastage = fusion.wastage;

  // 3️⃣ Recalculate block energy
  let blockPower = 0;
  Object.values(digitalTwin.blocks[block].rooms).forEach(r => {
    blockPower += r.power;
  });

  digitalTwin.blocks[block].energy.currentLoad = blockPower;
  digitalTwin.blocks[block].energy.totalEnergy += blockPower * (2 / 3600);

  // 4️⃣ Alert generation (PER BLOCK)
  digitalTwin.blocks[block].alerts = [];

  Object.entries(digitalTwin.blocks[block].rooms).forEach(([id, r]) => {
    if (r.wastage) {
      digitalTwin.blocks[block].alerts.push(
        `Energy wastage detected in room ${id}`
      );
    }
  });

  res.json({ status: "Digital Twin updated" });
});
app.get("/wardenSummary", (req, res) => {
  const summary = {};

  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    const rooms = Object.values(data.rooms);

    const occupiedCount = rooms.filter(
      r => r.inferredOccupancy === "OCCUPIED"
    ).length;

    const wastageCount = rooms.filter(r => r.wastage).length;

    summary[block] = {
      occupiedRooms: occupiedCount,
      totalRooms: rooms.length,
      currentLoad: data.energy.currentLoad,
      wastageRooms: wastageCount,
      alerts: data.alerts
    };
  });

  res.json(summary);
});
app.post("/control/room", (req, res) => {
  const { block, room, light, fan } = req.body;

  const roomId = `${block}-${room}`;
  const roomState = digitalTwin.blocks[block].rooms[roomId];

  // Rule enforcement
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
