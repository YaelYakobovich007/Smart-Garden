import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#3da339',
    borderRadius: 30,
    margin: 16,
    paddingVertical: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toolbarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 4,
  },
  toolbarLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 