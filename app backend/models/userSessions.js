const socketToEmail = new Map(); // ws → email
const emailToSocket = new Map(); // email → ws

function addUserSession(ws, email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  socketToEmail.set(ws, normalizedEmail);
  emailToSocket.set(normalizedEmail, ws);
}

function removeUserSession(ws) {
  const email = socketToEmail.get(ws);
  socketToEmail.delete(ws);
  if (email) emailToSocket.delete(email);
}

function getEmailBySocket(ws) {
  return socketToEmail.get(ws);
}

function getSocketByEmail(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  return emailToSocket.get(normalizedEmail);
}

function getAllSessions() {
  return [...socketToEmail.entries()];
}

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
