import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E6F0FA',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    margin: 20
  },
  temp: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333'
  },
  description: {
    fontSize: 18,
    color: '#666',
    marginVertical: 4
  },
  location: {
    fontSize: 16,
    color: '#888'
  }
});

export default styles; 