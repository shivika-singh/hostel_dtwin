const mongoose = require("mongoose");

const OccupancySchema = new mongoose.Schema({
  room_id: String,
  occupancy: Number, // 0 or 1
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Occupancy", OccupancySchema);
