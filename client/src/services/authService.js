const ws = new WebSocket('ws://172.25.224.1:3000');

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