// Run this after 3-4 hours to generate paper results
// node generate_results.js

const fs = require("fs");
const log = JSON.parse(fs.readFileSync("energy_log.json", "utf8"));

console.log("\n" + "=".repeat(60));
console.log("  SMART HOSTEL — REAL SESSION RESULTS");
console.log("=".repeat(60));
console.log(`Session started: ${log.started}`);
console.log(`Total readings:  ${log.readings.length}`);
console.log(`Duration:        ~${(log.readings.length * 0.5).toFixed(1)} hours`);
console.log("=".repeat(60));

let totalEnergy = 0;
let totalWastage = 0;
let totalCarbon = 0;
let totalCost = 0;
let avgLoad = 0;
let maxLoad = 0;
let maxLoadTime = "";
let strategyReadings = {};

log.readings.forEach(r => {
  totalEnergy  += r.energy_kWh_this_interval;
  totalCarbon  += r.carbon_kg_this_interval;
  totalCost    += r.cost_inr_this_interval;
  avgLoad      += r.totalPower_W;
  if (r.totalPower_W > maxLoad) {
    maxLoad = r.totalPower_W;
    maxLoadTime = r.timestamp;
  }

  const s = r.appliedStrategy?.strategyId || "baseline";
  if (!strategyReadings[s]) strategyReadings[s] = [];
  strategyReadings[s].push(r);
});

avgLoad = avgLoad / log.readings.length;

// Annual projections
const hoursLogged = log.readings.length * 0.5;
const annualFactor = (18 * 365) / hoursLogged;

console.log("\n📊 SESSION SUMMARY:");
console.log(`  Total energy consumed: ${totalEnergy.toFixed(3)} kWh`);
console.log(`  Total carbon emitted:  ${totalCarbon.toFixed(3)} kg CO₂`);
console.log(`  Total cost:            ₹${totalCost.toFixed(2)}`);
console.log(`  Average load:          ${avgLoad.toFixed(0)}W`);
console.log(`  Peak load:             ${maxLoad}W at ${maxLoadTime}`);

console.log("\n📈 ANNUAL PROJECTIONS (based on 18hr/day operation):");
console.log(`  Energy/year:  ${(totalEnergy * annualFactor).toFixed(1)} kWh`);
console.log(`  Carbon/year:  ${(totalCarbon * annualFactor).toFixed(1)} kg CO₂`);
console.log(`  Cost/year:    ₹${(totalCost * annualFactor).toFixed(0)}`);

console.log("\n🔍 STRATEGY COMPARISON:");
Object.entries(strategyReadings).forEach(([sid, readings]) => {
  const avgPower = readings.reduce((s, r) => s + r.totalPower_W, 0) / readings.length;
  const avgWastage = readings.reduce((s, r) => s + r.wastageRooms, 0) / readings.length;
  const name = sid === "baseline" ? "Baseline (No Strategy)" : `Strategy ${sid}`;
  console.log(`\n  ${name}:`);
  console.log(`    Readings:      ${readings.length}`);
  console.log(`    Avg load:      ${avgPower.toFixed(0)}W`);
  console.log(`    Avg wastage:   ${avgWastage.toFixed(1)} rooms`);
  console.log(`    Annual energy: ${(avgPower * 18 * 365 / 1000).toFixed(0)} kWh`);
  console.log(`    Annual carbon: ${(avgPower * 18 * 365 / 1000 * 0.82).toFixed(0)} kg CO₂`);
  console.log(`    Annual cost:   ₹${(avgPower * 18 * 365 / 1000 * 8).toFixed(0)}`);
});

console.log("\n" + "=".repeat(60));
console.log("  Copy these numbers into your paper results section");
console.log("=".repeat(60) + "\n");