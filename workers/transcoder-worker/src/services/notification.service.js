const axios = require("axios");

async function notifyVideoCompleted(
  video
) {

  await axios.post(
    `${process.env.API_URL}/events/video-completed`,
    video
  );
}

module.exports = {
  notifyVideoCompleted
};