/**
 * User Sessions Model
 *
 * In-memory mapping between connected WebSocket instances and user emails.
 */
const socketToEmail = new Map(); // ws → email
const emailToSocket = new Map(); // email → ws

/** Map a WebSocket to an email (normalized) */
function addUserSession(ws, email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  socketToEmail.set(ws, normalizedEmail);
  emailToSocket.set(normalizedEmail, ws);
}

/** Remove session mapping for a WebSocket */
function removeUserSession(ws) {
  const email = socketToEmail.get(ws);
  socketToEmail.delete(ws);
  if (email) emailToSocket.delete(email);
}

/** Get normalized email for a given WebSocket */
function getEmailBySocket(ws) {
  return socketToEmail.get(ws);
}

/** Get WebSocket by email (case-insensitive) */
function getSocketByEmail(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  return emailToSocket.get(normalizedEmail);
}

/** Return [ws,email] entries */
function getAllSessions() {
  return [...socketToEmail.entries()];
}

/** Return array of all connected user sockets */
function getAllUserSockets() {
  return [...socketToEmail.keys()];
}

module.exports = {
  addUserSession,
  removeUserSession,
  getEmailBySocket,
  getSocketByEmail,
  getAllSessions,
  getAllUserSockets
};
