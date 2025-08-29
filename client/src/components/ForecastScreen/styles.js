/**
 * styles.js - Beautiful Forecast Screen Styles
 * 
 * Full-screen gradient weather display with:
 * - Dynamic gradient backgrounds
 * - Beautiful temperature display
 * - SVG curved elements
 * - Forecast preview section
 */

import { StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Layout constants
const CARD_WIDTH_SINGLE = width - 30; // card width with margins
const CURVE_HEIGHT = 40;              // height of the line's arc
const CURVE_GAP = 20;                 // gap between line and white area
const FORECAST_HEIGHT = 400;          // height of the white forecast area (increased for details)

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
  },
  
  // Full screen gradient container
  fullScreenGradient: {
    flex: 1,
  },

  // Stars container for night time
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // Individual star styling
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Header section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 20,
    zIndex: 10,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Nunito_700Bold',
  },
  
  // Simulation styles removed

  // Weather card container - fills most of the screen
  weatherCardContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 20,
    zIndex: 5,
  },

  // Top section with temperature and info
  topSection: {
    alignItems: 'center',
    paddingTop: 5,
    marginBottom: 30,
  },

  temperatureText: {
    fontSize: 56,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },

  conditionText: {
    fontSize: 16,
    color: '#f8f8f8',
    marginTop: -10,
    fontFamily: 'Nunito_400Regular',
    textTransform: 'capitalize',
  },

  cityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
    marginTop: 10,
    fontFamily: 'Nunito_700Bold',
  },

  dateText: {
    fontSize: 14,
    color: '#f8f8f8',
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
  },

  // Weather animation container and styles
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },

  weatherAnimation: {
    width: 120,
    height: 120,
  },

  // Forecast container with SVG curves
  forecastContainer: {
    height: CURVE_HEIGHT + CURVE_GAP + FORECAST_HEIGHT,
    width: CARD_WIDTH_SINGLE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'center',
  },

  // Sunrise and sunset times container
  sunTimesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 10,
  },

  sunTimeLeft: {
    alignItems: 'center',
  },

  sunTimeRight: {
    alignItems: 'center',
  },

  sunTimeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  svgStyle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  // Forecast section inside the white curved area
  forecastSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FORECAST_HEIGHT - 20,
    paddingTop: 20,
  },

  // Vertical scroll view for all content
  detailsScrollView: {
    flex: 1,
  },

  detailsScrollContent: {
    paddingBottom: 20,
  },

  // Weekly forecast container
  weeklyForecastContainer: {
    height: 100,
    marginBottom: 20,
  },

  // Horizontal scroll view for forecast
  forecastScrollView: {
    flex: 1,
  },

  forecastScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  forecastItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    minWidth: 65,
    paddingVertical: 8,
  },

  // Weather details section
  weatherDetailsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  detailItem: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  detailLabel: {
    fontSize: 12,
    color: '#757575',
    fontFamily: 'Nunito_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },

  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Nunito_700Bold',
    marginTop: 4,
    textAlign: 'center',
  },

  forecastDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    fontFamily: 'Nunito_500Medium',
    textAlign: 'center',
    marginBottom: 4,
  },

  forecastIcon: {
    marginVertical: 4,
  },

  forecastTemp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    marginTop: 2,
  },

  forecastLow: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    marginTop: 1,
  },
});

export default styles;