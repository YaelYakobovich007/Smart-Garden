// controllers/authController.js
const authService = require('../services/authService');

async function handleAuthMessage(data, ws) {
  if (data.type === 'REGISTER') {
    if (!data.email || !data.password) {
      ws.send(JSON.stringify({ type: 'REGISTER_FAIL', reason: 'Email and password are required' }));
      return;
    }
    
    if (!isValidEmail(data.email)) {
      ws.send(JSON.stringify({ type: 'REGISTER_FAIL', reason: 'Invalid email format' }));
      return;
    }

    if (data.password.length < 6) {
      ws.send(JSON.stringify({ type: 'REGISTER_FAIL', reason: 'Password must be at least 6 characters long' }));
      return;
    }

    const success = await authService.register(data.email, data.password);
    ws.send(JSON.stringify(success
      ? { type: 'REGISTER_SUCCESS', message: 'User created' }
      : { type: 'REGISTER_FAIL', reason: 'Email already exists' }));
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  handleAuthMessage
};
