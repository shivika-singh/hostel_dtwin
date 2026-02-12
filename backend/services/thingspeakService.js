
const axios = require("axios");
const config = require("../thingspeakConfig");

async function fetchBlockData(block) {
  const { channelId, readKey } = config[block];

  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readKey}&results=10`;

  const res = await axios.get(url);
  return res.data.feeds;
}

module.exports = { fetchBlockData };
