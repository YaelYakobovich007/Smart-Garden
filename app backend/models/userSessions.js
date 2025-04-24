const socketToEmail = new Map(); // ws → email
const emailToSocket = new Map(); // email → ws

function addUserSession(ws, email) {
  socketToEmail.set(ws, email);
  emailToSocket.set(email, ws);
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
  return emailToSocket.get(email);
}

function getAllSessions() {
  return [...socketToEmail.entries()];
}

module.exports = {
  addUserSession,
  removeUserSession,
  getEmailBySocket,
  getSocketByEmail,      
  getAllSessions
};
