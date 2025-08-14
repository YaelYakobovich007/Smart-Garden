function sendSuccess(ws, type, payload) {
    try {
        if (ws.readyState === 1) { // WebSocket.OPEN
            const body = (payload && typeof payload === 'object' && !Array.isArray(payload))
                ? { type, ...payload }
                : { type, data: payload };
            ws.send(JSON.stringify(body));
        } else {
            console.error(`Cannot send success message: WebSocket not open. State: ${ws.readyState}`);
        }
    } catch (error) {
        console.error('Error sending success message:', error.message);
    }
}

function sendError(ws, type, reason) {
    try {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify({ type, reason }));
        } else {
            console.error(`Cannot send error message: WebSocket not open. State: ${ws.readyState}`);
        }
    } catch (error) {
        console.error('Error sending error message:', error.message);
    }
}

module.exports = { sendSuccess, sendError };
