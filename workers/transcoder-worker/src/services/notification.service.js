import axios from "axios";

async function notifyVideoCompleted(video) {
  await axios.post(`${process.env.API_URL}/events/video-completed`, video);
}

export { notifyVideoCompleted };
