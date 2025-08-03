import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    padding: 16,
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: '#F0F8F0',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    minHeight: 180,
  },
  compact: {
    width: '100%',
    height: 170,
    padding: 5,
  },
  animation: {
    width: 75,
    height: 75,
    marginBottom: 8,
    marginLeft: 10
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  animationContainer: {
    flex: 0.3,
    alignItems: 'center',
  },
  tempContainer: {
    flex: 0.7,
    alignItems: 'center',
    paddingLeft: 15,
  },
  temp: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
    marginLeft: 10
  },
  description: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    maxWidth: 120,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#388E3C',
    textAlign: 'center',
    maxWidth: 120,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
  },
  feelsLike: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
    marginBottom: 6,
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginBottom: 30
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 10,
    color: '#2E7D32',
    fontFamily: 'Nunito_400Regular',
    marginLeft: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    color: '#1B5E20',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#2C3E50',
    textAlign: 'center'
  }
});

export default styles; 