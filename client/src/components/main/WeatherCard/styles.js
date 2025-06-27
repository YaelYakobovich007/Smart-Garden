import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    margin: 16,
    height: 120,
  },
  animation: {
    width: 130,
    height: 130,
    marginTop: -40,
    marginLeft: -15,
  },
  leftSection: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  temp: {
    fontSize: 55,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
    position: 'absolute',
    left: 185,
    top: 35,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    marginTop: -10,
    textAlign: 'center',
    maxWidth: 100,
    fontWeight: '500',
  },
  location: {
    fontSize: 12,
    color: '#E8F5E8',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center'
  }
});

export default styles; 