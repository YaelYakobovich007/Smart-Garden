import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'user_session';

class SessionService {
  // Save user session
  async saveSession(userData) {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  // Get user session
  async getSession() {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Clear user session (logout)
  async clearSession() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }

  // Check if user is logged in
  async isLoggedIn() {
    const session = await this.getSession();
    return session !== null;
  }
}

const sessionService = new SessionService();
export default sessionService; 