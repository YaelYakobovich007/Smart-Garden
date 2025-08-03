/**
 * Onboarding Service - First-Time User Experience Management
 * 
 * This service manages the onboarding flow for new users.
 * It handles:
 * - Checking if user has completed onboarding
 * - Marking onboarding as completed
 * - Resetting onboarding state for testing
 * 
 * The service uses AsyncStorage to persist onboarding state
 * and ensures users see the onboarding only once.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

class OnboardingService {
  /**
   * Check if user has completed onboarding
   * @returns {Promise<boolean>} True if onboarding is completed
   */
  async isOnboardingCompleted() {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   * @returns {Promise<void>}
   */
  async markOnboardingCompleted() {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('Onboarding marked as completed');
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
    }
  }

  /**
   * Reset onboarding state (for testing purposes)
   * @returns {Promise<void>}
   */
  async resetOnboarding() {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      console.log('Onboarding state reset');
    } catch (error) {
      console.error('Error resetting onboarding state:', error);
    }
  }

  /**
   * Get onboarding status for debugging
   * @returns {Promise<Object>} Onboarding status information
   */
  async getOnboardingInfo() {
    try {
      const completed = await this.isOnboardingCompleted();
      return {
        completed,
        key: ONBOARDING_COMPLETED_KEY,
      };
    } catch (error) {
      console.error('Error getting onboarding info:', error);
      return {
        completed: false,
        error: error.message,
      };
    }
  }
}

export default new OnboardingService(); 