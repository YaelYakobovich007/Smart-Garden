const { getUser, updateUserName, updateUserLocation, updateUserPassword, createPasswordResetToken, validatePasswordResetToken, usePasswordResetToken } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const { isValidName, isValidPassword, isValidLocation, isValidCountryAndCity, isValidEmail } = require('../utils/validators');
const emailService = require('../services/emailService');

const userHandlers = {};
userHandlers.GET_USER_NAME = handleGetUserName;
userHandlers.UPDATE_FULL_NAME = handleUpdateName;
userHandlers.UPDATE_LOCATION = handleUpdateLocation;
userHandlers.UPDATE_PASSWORD = handleUpdatePassword;
userHandlers.FORGOT_PASSWORD = handleForgotPassword;
userHandlers.RESET_PASSWORD = handleResetPassword;
userHandlers.VALIDATE_RESET_TOKEN = handleValidateResetToken;

async function handleUserMessage(data, ws) {
  try {
    const email = getEmailBySocket(ws);

    // Some handlers don't require authentication (forgot password, reset password)
    const publicHandlers = ['FORGOT_PASSWORD', 'RESET_PASSWORD', 'VALIDATE_RESET_TOKEN'];

    if (!publicHandlers.includes(data.type) && !email) {
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
      return sendError(ws, 'UPDATE_FULL_NAME_FAIL', 'New name is required');
    }

    if (!isValidName(newName)) {
      return sendError(ws, 'UPDATE_FULL_NAME_FAIL', 'Invalid name format. Name should be 2-50 characters with letters, spaces, hyphens, and apostrophes only');
    }

    const updatedName = await updateUserName(email, newName.trim());
    if (!updatedName) {
      return sendError(ws, 'UPDATE_FULL_NAME_FAIL', 'Failed to update name');
    }

    sendSuccess(ws, 'UPDATE_FULL_NAME_SUCCESS', { fullName: updatedName });
  } catch (err) {
    console.error('Update name error:', err);
    sendError(ws, 'UPDATE_FULL_NAME_FAIL', 'Failed to update name');
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

async function handleForgotPassword(data, ws, email) {
  try {
    const { email: requestEmail } = data;

    if (!requestEmail) {
      return sendError(ws, 'FORGOT_PASSWORD_FAIL', 'Email is required');
    }

    if (!isValidEmail(requestEmail)) {
      return sendError(ws, 'FORGOT_PASSWORD_FAIL', 'Invalid email format');
    }

    // Create password reset code
    const tokenInfo = await createPasswordResetToken(requestEmail);

    if (!tokenInfo) {
      // Email does not exist in the system
      return sendError(ws, 'FORGOT_PASSWORD_FAIL', 'Email does not exist in the system');
    }

    // Send password reset email with code
    const emailSent = await emailService.sendPasswordResetEmail(
      tokenInfo.email,
      tokenInfo.fullName,
      tokenInfo.token // This is now the 6-digit code
    );

    if (emailSent) {
      sendSuccess(ws, 'FORGOT_PASSWORD_SUCCESS', {
        message: 'Password reset code has been sent to your email'
      });
    } else {
      sendError(ws, 'FORGOT_PASSWORD_FAIL', 'Failed to send password reset code');
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    sendError(ws, 'FORGOT_PASSWORD_FAIL', 'Failed to process password reset request');
  }
}

async function handleResetPassword(data, ws, email) {
  try {
    const { token, newPassword } = data;

    if (!token || !newPassword) {
      return sendError(ws, 'RESET_PASSWORD_FAIL', 'Code and new password are required');
    }

    if (!isValidPassword(newPassword)) {
      return sendError(ws, 'RESET_PASSWORD_FAIL', 'New password must be at least 8 characters with at least one letter and one number');
    }

    // Use the code to reset password
    const success = await usePasswordResetToken(token, newPassword);

    if (success) {
      sendSuccess(ws, 'RESET_PASSWORD_SUCCESS', {
        message: 'Password has been reset successfully'
      });
    } else {
      sendError(ws, 'RESET_PASSWORD_FAIL', 'Invalid or expired reset code');
    }
  } catch (err) {
    console.error('Reset password error:', err);
    sendError(ws, 'RESET_PASSWORD_FAIL', 'Failed to reset password');
  }
}

async function handleValidateResetToken(data, ws, email) {
  try {
    const { token } = data;

    if (!token) {
      return sendError(ws, 'VALIDATE_RESET_TOKEN_FAIL', 'Code is required');
    }

    // Validate the code
    const tokenInfo = await validatePasswordResetToken(token);

    if (tokenInfo) {
      sendSuccess(ws, 'VALIDATE_RESET_TOKEN_SUCCESS', {
        valid: true,
        email: tokenInfo.email,
        expiresAt: tokenInfo.expires_at
      });
    } else {
      sendSuccess(ws, 'VALIDATE_RESET_TOKEN_SUCCESS', {
        valid: false
      });
    }
  } catch (err) {
    console.error('Validate reset code error:', err);
    sendError(ws, 'VALIDATE_RESET_TOKEN_FAIL', 'Failed to validate reset code');
  }
}

module.exports = {
  handleUserMessage
};
