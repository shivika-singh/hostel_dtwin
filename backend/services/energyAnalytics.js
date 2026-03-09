const analytics = {
  blocks: {}
};

function initBlock(block) {
  if (!analytics.blocks[block]) {
    analytics.blocks[block] = {
      totalEnergyWh: 0,
      wastedEnergyWh: 0,
      savedEnergyWh: 0,
      energyTimeline: []
    };
  }
}

function updateEnergy(block, powerW, wastage) {
  initBlock(block); // ✅ CRITICAL FIX

  const energyWh = powerW * (2 / 3600); // 2-second timestep

  analytics.blocks[block].totalEnergyWh += energyWh;

  if (wastage) {
    analytics.blocks[block].wastedEnergyWh += energyWh;
  } else {
    analytics.blocks[block].savedEnergyWh += energyWh;
  }

  analytics.blocks[block].energyTimeline.push({
    time: Date.now(),
    powerW
  });

  // prevent memory explosion
  if (analytics.blocks[block].energyTimeline.length > 300) {
    analytics.blocks[block].energyTimeline.shift();
  }
}

function getBlockAnalytics(block) {
  initBlock(block); // safety
  return analytics.blocks[block];
}

module.exports = {
  updateEnergy,
  getBlockAnalytics
};
