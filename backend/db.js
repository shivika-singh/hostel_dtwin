const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/hostelDT");

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.log("MongoDB connection error:", err);
});

module.exports = mongoose;
