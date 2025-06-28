import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#F0F8F0',

    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    height: 110,
    minWidth: 140,
    maxWidth: 300,
  },
  compact: {
    width: '100%',
    height: 110,
    padding: 8,
  },
  animation: {
    width: 85,
    height: 85,
    marginTop: -37,
    marginLeft: -5,
  },
  leftSection: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  temp: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'left',
    position: 'absolute',
    left: 120,
    top: 10,
    fontFamily: 'Nunito_700Bold',
  },
  description: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 0,
    textAlign: 'center',
    maxWidth: 60,
    fontFamily: 'Nunito_700Bold',
  },
  location: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 120,
    fontFamily: 'Nunito_700Bold',
  },
  loadingText: {
    fontSize: 12,
    color: '#2C3E50',
    textAlign: 'center'
  }
});

export default styles; 