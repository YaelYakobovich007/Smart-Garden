/**
 * Socket Router
 *
 * Entrypoint for a new WebSocket connection. The very first client message
 * must include a `type` field identifying the client as either `HELLO_PI` or
 * `HELLO_USER`. Based on that, the connection is delegated to the
 * corresponding socket handler.
 */
const { handleUserSocket } = require('./userSocket');
const { handlePiSocket } = require('./piSocket');
const { sendError } = require('../utils/wsResponses');

/**
 * Route the connection to user or Pi handler based on the first message.
 * @param {import('ws')} ws - WebSocket connection
 * @param {{type:string}} firstMessage - The parsed first message
 */
function handleSocketConnection(ws, firstMessage) {
  if (firstMessage.type === 'HELLO_PI') {
    handlePiSocket(ws);
  } else if (firstMessage.type === 'HELLO_USER') {
    handleUserSocket(ws);
  } else {
    sendError(ws, 'ERROR', 'Unknown socket type');
    ws.close();
  }
}

module.exports = { handleSocketConnection };
