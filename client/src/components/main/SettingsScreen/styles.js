import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Nunito_700Bold',
  },
  headerSpacer: {
    width: 34, // Same width as back button for centering
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 10,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Nunito_500Medium',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontFamily: 'Nunito_400Regular',
  },
  logoutItem: {
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 20,
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#E74C3C',
    fontWeight: '500',
    fontFamily: 'Nunito_500Medium',
  },
  clearSessionItem: {
    marginTop: 5,
    borderRadius: 8,
    marginHorizontal: 20,
    borderBottomWidth: 0,
  },
  clearSessionText: {
    color: '#F39C12',
    fontWeight: '500',
    fontFamily: 'Nunito_500Medium',
  },
}); 