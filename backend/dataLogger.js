// ============================================================
// DATA LOGGER
// Saves Digital Twin snapshots every 30 minutes
// Used to generate real paper results after 3-4 hours of running
// ============================================================

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "energy_log.json");
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function initLog() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify({
      started: new Date().toISOString(),
      readings: []
    }, null, 2));
  }
}

function saveReading(digitalTwin) {
  const log = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));

  let totalPower = 0;
  let wastagePower = 0;
  let wastageRooms = 0;
  const blockData = {};

  Object.entries(digitalTwin.blocks).forEach(([block, data]) => {
    let blockPower = 0;
    let blockWastage = 0;
    let blockOccupied = 0;

    Object.values(data.rooms).forEach(room => {
      const p = room.power || 0;
      totalPower += p;
      blockPower += p;
      if (room.wastage) {
        wastagePower += p;
        wastageRooms++;
        blockWastage++;
      }
      if (room.occupancy) blockOccupied++;
    });

    blockData[block] = {
      power_W: blockPower,
      wastageRooms: blockWastage,
      occupiedRooms: blockOccupied
    };
  });

  const CEA  = 0.82;
  const RERC = 8.0;
  const kwhHour = totalPower / 1000;

  const reading = {
    timestamp:       new Date().toISOString(),
    totalPower_W:    totalPower,
    wastagePower_W:  wastagePower,
    wastageRooms,
    energy_kWh_this_interval: kwhHour * 0.5, // 30 min = 0.5 hr
    carbon_kg_this_interval:  kwhHour * 0.5 * CEA,
    cost_inr_this_interval:   kwhHour * 0.5 * RERC,
    appliedStrategy: digitalTwin.appliedStrategy || null,
    blockData
  };

  log.readings.push(reading);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`📊 Data logged at ${reading.timestamp} | Load: ${totalPower}W | Wastage: ${wastageRooms} rooms`);
}

function startLogging(digitalTwin) {
  initLog();
  console.log("📊 Data logger started — saving every 30 minutes");
  setInterval(() => saveReading(digitalTwin), INTERVAL_MS);
  // Save first reading immediately
  setTimeout(() => saveReading(digitalTwin), 5000);
}

module.exports = { startLogging };