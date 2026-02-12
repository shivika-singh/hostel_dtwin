const axios = require("axios");

async function buildBlock(blockId, config) {
  const url = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.readKey}&results=10`;
  const res = await axios.get(url);

  const rooms = {};
  let totalPower = 0;

  res.data.feeds.forEach(entry => {
    if (!entry.field1) return;

    const roomId = `${blockId}-${entry.field1}`;
    const light = Number(entry.field5);
    const fan = Number(entry.field6);

    const power = (light ? 40 : 0) + (fan ? 70 : 0);
    totalPower += power;

    rooms[roomId] = {
      occupancy: Number(entry.field2),
      temperature: Number(entry.field3),
      co2: Number(entry.field4),
      light,
      fan,
      power
    };
  });

  return {
    type: config.type,
    rooms,
    energy: {
      currentLoad: totalPower
    }
  };
}

async function buildHostelTwin() {
  const blocks = {};

  blocks["G1"] = await buildBlock("G1", {
    channelId: "3258459",
    readKey: "3JP35Z7U7KR6N0HQ",
    type: "Girls"
  });

  blocks["G2"] = await buildBlock("G2", {
    channelId: "3258460",
    readKey: "X80849RT3DEI1ERS",
    type: "Girls"
  });
blocks["B1"] = await buildBlock("B1", {
  channelId: "3258461",
  readKey: "T6XVOQOD29YBZR3Q",
  type: "Boys"
});
blocks["B2"] = await buildBlock("B2", {
  channelId: "3258464",
  readKey: "B0NA52F1MVZARVKY",
  type: "Boys"
});

  return {
    blocks,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { buildHostelTwin };
