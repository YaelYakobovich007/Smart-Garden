import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // Header styles (matching app design)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Nunito_700Bold',
  },
  headerSpacer: {
    width: 32,
  },

  // ScrollView styles
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Section styles (matching app design)
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
    fontFamily: 'Nunito_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    fontFamily: 'Nunito_400Regular',
  },

  // Animation stage
  animationStage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: '#ECF0F1',
  },

  // Sensor badge
  sensorBadge: {
    position: "absolute",
    top: -8,
    right: -30,
    backgroundColor: "#4CAF50",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#E8F5E8",
  },
  sensorBadgeText: { 
    color: "#FFFFFF", 
    fontWeight: "800", 
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },

  // Instructions
  instructionsContainer: {
    marginBottom: 20,
  },
  instructionText: { 
    color: "#5B6D73", 
    fontSize: 14, 
    lineHeight: 20, 
    marginBottom: 8,
    fontFamily: 'Nunito_400Regular',
  },

  // Confirm button (matching app design)
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonPressed: {
    backgroundColor: '#45A049',
    shadowOpacity: 0.2,
    elevation: 3,
  },
  confirmButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "600", 
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },

  // Success state
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },


});

export default styles;
