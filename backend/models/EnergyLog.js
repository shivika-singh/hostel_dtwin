const mongoose = require("mongoose");

const EnergySchema = new mongoose.Schema({
  room_id: String,
  power_consumed: Number, 
  energy_saved: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("EnergyLog", EnergySchema);
