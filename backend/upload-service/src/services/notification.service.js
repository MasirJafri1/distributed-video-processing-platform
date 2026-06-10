import { broadcast } from "./realtime.service.js";
import * as EVENTS from "../constants/events.js";

async function notifyVideoCompleted(video) {
  await broadcast({
    type: EVENTS.VIDEO_COMPLETED,
    video,
  });
}

export { notifyVideoCompleted };
