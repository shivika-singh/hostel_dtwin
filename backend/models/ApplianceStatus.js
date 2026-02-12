const mongoose = require("mongoose");

const ApplianceSchema = new mongoose.Schema({
  room_id: String,
  light_status: Number, // 0 or 1
  fan_status: Number,   // 0 or 1
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ApplianceStatus", ApplianceSchema);
