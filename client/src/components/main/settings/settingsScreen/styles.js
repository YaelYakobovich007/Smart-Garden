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
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'Nunito_700Bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    backgroundColor: '#FAFBFC',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonSecondary: {
    backgroundColor: '#EEF3F7',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
  },
  buttonSecondaryText: {
    color: '#333',
  },
  hintText: {
    marginTop: 10,
    fontSize: 12,
    color: '#6C757D',
    fontFamily: 'Nunito_400Regular',
  },
  // Picker styles reused from register for consistency
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    marginBottom: 8,
    minHeight: 50,
  },
  pickerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerDisplayText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#888',
  },
  pickerIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalPicker: {
    height: 200,
  },
});


