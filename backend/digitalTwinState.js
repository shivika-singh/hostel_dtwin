const BLOCKS = ["G1", "G2", "B1", "B2"];
const ROOM_COUNT = 10;

const digitalTwin = {
  blocks: {}
};

BLOCKS.forEach(block => {
  digitalTwin.blocks[block] = {
    rooms: {},
    energy: {
      currentLoad: 0,
      totalEnergy: 0
    },
    alerts: []
  };

  for (let i = 1; i <= ROOM_COUNT; i++) {
    digitalTwin.blocks[block].rooms[`${block}-${i}`] = {
      occupancy: 0,
      temperature: 25,
      co2: 400,
      light: 0,
      fan: 0,
      power: 0,
      lastUpdated: Date.now()
    };
  }
});

module.exports = digitalTwin;
