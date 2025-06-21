function sendSuccess(ws, type, payload) {
    ws.send(JSON.stringify({ type, ...payload }));
}
  
function sendError(ws, type, reason) {
  ws.send(JSON.stringify({ type, reason }));
}  
  
module.exports = { sendSuccess, sendError };
  