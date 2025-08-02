const { getUser, updateUserName, updateUserLocation, updateUserPassword } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const { isValidName, isValidPassword, isValidLocation, isValidCountryAndCity } = require('../utils/validators');

const userHandlers = {};
userHandlers.GET_USER_NAME = handleGetUserName;
userHandlers.UPDATE_FULL_NAME = handleUpdateName;
userHandlers.UPDATE_LOCATION = handleUpdateLocation;
userHandlers.UPDATE_PASSWORD = handleUpdatePassword;

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
  if (!user) return sendError(ws, 'GET_USER_NAME_FAIL', 'User not found');
  sendSuccess(ws, 'GET_USER_NAME_SUCCESS', { fullName: user.full_name });
}

async function handleUpdateName(data, ws, email) {
  try {
    const { newName } = data;

    if (!newName) {
      return sendError(ws, 'UPDATE_NAME_FAIL', 'New name is required');
    }

    if (!isValidName(newName)) {
      return sendError(ws, 'UPDATE_NAME_FAIL', 'Invalid name format. Name should be 2-50 characters with letters, spaces, hyphens, and apostrophes only');
    }

    const updatedName = await updateUserName(email, newName.trim());
    if (!updatedName) {
      return sendError(ws, 'UPDATE_NAME_FAIL', 'Failed to update name');
    }

    sendSuccess(ws, 'UPDATE_NAME_SUCCESS', { fullName: updatedName });
  } catch (err) {
    console.error('Update name error:', err);
    sendError(ws, 'UPDATE_NAME_FAIL', 'Failed to update name');
  }
}

async function handleUpdateLocation(data, ws, email) {
  try {
    const { country, city } = data;

    if (!isValidLocation(country, city)) {
      return sendError(ws, 'UPDATE_LOCATION_FAIL', 'Country and city are required');
    }

    if (!isValidCountryAndCity(country, city)) {
      return sendError(ws, 'UPDATE_LOCATION_FAIL', 'Invalid country or city');
    }

    const updatedLocation = await updateUserLocation(email, country.trim(), city.trim());
    if (!updatedLocation) {
      return sendError(ws, 'UPDATE_LOCATION_FAIL', 'Failed to update location');
    }

    sendSuccess(ws, 'UPDATE_LOCATION_SUCCESS', {
      country: updatedLocation.country,
      city: updatedLocation.city
    });
  } catch (err) {
    console.error('Update location error:', err);
    sendError(ws, 'UPDATE_LOCATION_FAIL', 'Failed to update location');
  }
}

async function handleUpdatePassword(data, ws, email) {
  try {
    const { currentPassword, newPassword } = data;

    if (!currentPassword || !newPassword) {
      return sendError(ws, 'UPDATE_PASSWORD_FAIL', 'Current password and new password are required');
    }

    if (!isValidPassword(newPassword)) {
      return sendError(ws, 'UPDATE_PASSWORD_FAIL', 'New password must be at least 8 characters with at least one letter and one number');
    }

    // Get current user to verify current password
    const user = await getUser(email);
    if (!user) {
      return sendError(ws, 'UPDATE_PASSWORD_FAIL', 'User not found');
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return sendError(ws, 'UPDATE_PASSWORD_FAIL', 'Current password is incorrect');
    }

    // Update password
    const success = await updateUserPassword(email, newPassword);
    if (!success) {
      return sendError(ws, 'UPDATE_PASSWORD_FAIL', 'Failed to update password');
    }

    sendSuccess(ws, 'UPDATE_PASSWORD_SUCCESS', { message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    sendError(ws, 'UPDATE_PASSWORD_FAIL', 'Failed to update password');
  }
}

module.exports = {
  handleUserMessage
};
