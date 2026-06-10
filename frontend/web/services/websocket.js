let socket;

export function connectWebSocket(onMessage) {
  socket = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

  socket.onopen = () => {
    console.log("connected");
  };

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);

    if (payload.type === "VIDEO_COMPLETED") {
      onMessage(payload);
    }
  };
}

export function disconnectWebSocket() {
  if (socket) {
    socket.close();
  }
}
