const {
  broadcast
} = require(
  "./realtime.service"
);

const EVENTS =
  require(
    "../constants/events"
  );

async function notifyVideoCompleted(
  video
) {

  await broadcast({
    type:
      EVENTS.VIDEO_COMPLETED,

    video
  });
}

module.exports = {
  notifyVideoCompleted
};