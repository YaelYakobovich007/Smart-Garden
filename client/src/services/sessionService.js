/**
 * Session Service - User Authentication and Session Management
 * 
 * This service manages user sessions using AsyncStorage for persistence.
 * It handles:
 * - Session creation and storage
 * - Session validation and expiration
 * - Session refresh and cleanup
 * - Long-term session persistence (90 days like Instagram)
 * 
 * The service provides a robust session management system that keeps
 * users logged in across app restarts and network interruptions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for user session data
const SESSION_KEY = 'user_session';
const SESSION_EXPIRY_DAYS = 90; // Keep session for 90 days like Instagram

class SessionService {
  /**
   * Save user session data to AsyncStorage
   * Includes timestamp and expiration date for session management
   * @param {Object} userData - User data to store (email, name, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async saveSession(userData) {
    try {
      const sessionData = {
        ...userData,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toISOString()
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  /**
   * Retrieve user session data from AsyncStorage
   * Checks for session expiration and clears expired sessions
   * @returns {Promise<Object|null>} Session data or null if not found/expired
   */
  async getSession() {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      
      // Check if session has expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        console.log('Session expired, clearing...');
        await this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Check if user is currently logged in
   * Validates session existence and expiration
   * @returns {Promise<boolean>} True if user is logged in
   */
  async isLoggedIn() {
    try {
      const session = await this.getSession();
      return session !== null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  /**
   * Clear user session data from AsyncStorage
   * Used for logout and expired session cleanup
   * @returns {Promise<boolean>} Success status
   */
  async clearSession() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }

  /**
   * Refresh session timestamp and expiration
   * Called periodically to keep session active
   * @returns {Promise<boolean>} Success status
   */
  async refreshSession() {
    try {
      const session = await this.getSession();
      if (session) {
        session.timestamp = new Date().toISOString();
        session.expiresAt = new Date(Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)).toISOString();
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Get session info without validation (for debugging)
   * Returns raw session data regardless of expiration
   * @returns {Promise<Object|null>} Raw session data
   */
  async getSessionInfo() {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
const sessionService = new SessionService();
export default sessionService; 