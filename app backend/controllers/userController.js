const { getUser } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');

const userHandlers = {};
userHandlers.GET_USER_NAME = handleGetUserName;
// TODO: userHandlers.UPDATE_NAME = handleUpdateName;
// TODO: userHandlers.UPDATE_ADDRESS = handleUpdateAddress;

async function handleUserMessage(data, ws) {
  try {
    const email = getEmailBySocket(ws);
    if (!email) {
      return sendError(ws, 'UNAUTHORIZED', 'User must be logged in');
    }
    const handler = userHandlers[data.type];
    if (handler) {
      await handler(data, ws, email);
    } else {
      sendError(ws, 'UNKNOWN_TYPE', `Unknown user message type: ${data.type}`);
    }
  } catch (err) {
    console.error('User message error:', err);
    sendError(ws, 'USER_ERROR', 'Internal server error');
  }
}

async function handleGetUserName(data, ws, email) {
  const user = await getUser(email);
  if (!user) return sendError(ws, 'GET_USERL_NAME_FAIL', 'User not found');
  sendSuccess(ws, 'GET_USER_NAME_SUCCESS', { fullName: user.full_name });
}

module.exports = {
  handleUserMessage
};
