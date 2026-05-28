let socket = null;

export const connectWebSocket =
  (onMessage) => {

    socket = new WebSocket(
      process.env
        .NEXT_PUBLIC_WEBSOCKET_URL
    );

    socket.onopen = () => {
      console.log(
        "WebSocket connected"
      );
    };

    socket.onmessage = (event) => {

      const data =
        JSON.parse(event.data);

      onMessage(data);
    };

    socket.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );
    };
  };

export const disconnectWebSocket =
  () => {

    if (socket) {
      socket.close();
    }
  };