const ws = new WebSocket('ws://192.168.68.61:8080');

export const connectAndSend = (payload, onMessage, onError) => {
  const handleMessage = (e) => {
    const data = JSON.parse(e.data);
    onMessage(data);
  };

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ws.onopen = () => {
        ws.send(JSON.stringify(payload));
    }
    ws.onmessage = handleMessage;
    ws.onerror = onError;
  } else {
    ws.send(JSON.stringify(payload));
  }
}; 