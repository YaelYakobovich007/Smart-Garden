// services/googleService.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  console.log('[GOOGLE] Verifying token...');
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log(`[GOOGLE] Token verified: email=${payload.email} name=${payload.name}`);
    return {
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    console.log(`[GOOGLE] Error: Failed to verify token - ${error.message}`);
    throw error;
  }
}

module.exports = {
  verifyGoogleToken
};
