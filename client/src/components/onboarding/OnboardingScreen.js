/**
 * Onboarding Screen Component - App Introduction and Setup
 * 
 * This component provides an introduction to the Smart Garden app features.
 * It displays:
 * - App value propositions and key features
 * - Interactive swipe navigation between screens
 * - Skip and Done functionality
 * - Smooth transitions and animations
 * 
 * The onboarding helps new users understand the app's capabilities
 * before they start using it.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import OnboardingImage from './OnboardingImage';
import onboardingService from '../../services/onboardingService';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  // Onboarding data with illustrations and content
  const onboardingData = [
    {
      id: 1,
      title: 'Grow with Us',
      subtitle: 'Discover how Smart Garden helps you take care of your plants - easily, efficiently, and sustainably.',
      type: 'grow',
      image: require('../../../assets/images/onboarding1.png'),
      backgroundColor: '#EAF5E4',
    },
    {
      id: 2,
      title: 'Real-Time Monitoring',
      subtitle: 'Track your plant\'s health, moisture levels, and weather conditions directly from your phone - anytime, anywhere.',
      type: 'monitor',
      image: require('../../../assets/images/onboarding2.png'),
      backgroundColor: '#EAF5E4',
    },
    {
      id: 3,
      title: 'Effortless Care',

      subtitle: 'Smart Garden waters your plants automatically and keeps you updated - so you can relax and enjoy a healthy garden without lifting a finger.',
      type: 'notify',
      image: require('../../../assets/images/onboarding3.png'),
      backgroundColor: '#EAF5E4',
    },
  ];

  /**
   * Handle scroll event to update current page indicator
   * @param {Object} event - Scroll event object
   */
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  /**
   * Navigate to next onboarding page
   */
  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
    } else {
      handleDone();
    }
  };

  /**
   * Skip onboarding and go to main app
   */
  const handleSkip = async () => {
    await onboardingService.markOnboardingCompleted();
    navigation.replace('Login');
  };

  /**
   * Complete onboarding and go to main app
   */
  const handleDone = async () => {
    await onboardingService.markOnboardingCompleted();
    navigation.replace('Login');
  };

  /**
   * Navigate to specific onboarding page
   * @param {number} index - Page index to navigate to
   */
  const goToPage = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setCurrentIndex(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#EAF5E4' }}>
      <StatusBar style="dark" backgroundColor="#EAF5E4" />
      
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Onboarding Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => (
          <View key={item.id} style={styles.page}>
            {/* Top Section - Image with Green Background */}
            <View style={styles.topSection}>
              <View style={styles.imageContainer}>
                {item.image ? (
                  <Image source={item.image} style={styles.image} resizeMode="cover" />
                ) : (
                  <OnboardingImage type={item.type} size={width * 0.6} />
                )}
              </View>
            </View>

            {/* Bottom Section - White Background with Text */}
            <View style={styles.bottomSection}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorsContainer}>
        {onboardingData.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              currentIndex === index && styles.activeIndicator,
            ]}
            onPress={() => goToPage(index)}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentIndex < onboardingData.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Get Started</Text>
            <Feather name="check" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Nunito_500Medium',
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width,
    height,
  },
  topSection: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 0.4,
    backgroundColor: '#EAF5E4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  image: {
    width: width,
    height: height * 0.6,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8E6C9',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    width: width * 0.4,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Nunito_500Medium',
    marginRight: 6,
  },
  doneButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    width: width * 0.4,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Nunito_500Medium',
    marginRight: 6,
  },
});

export default OnboardingScreen; 