/**
 * StatusPopupExample - Demo usage of StatusPopup
 *
 * Shows example buttons to trigger success and error popups
 * demonstrating the reusable modal component.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import StatusPopup from './StatusPopup';

const StatusPopupExample = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleSuccessAction = () => {
    setShowSuccess(false);
    // Add your success logic here
    console.log('Success action completed');
  };

  const handleErrorAction = () => {
    setShowError(false);
    // Add your error handling logic here
    console.log('Error action triggered');
  };

  return (
    <View style={styles.container}>
      {/* Success Button */}
      <TouchableOpacity
        style={[styles.button, styles.successButton]}
        onPress={() => setShowSuccess(true)}
      >
        <Text style={styles.buttonText}>Show Success Popup</Text>
      </TouchableOpacity>

      {/* Error Button */}
      <TouchableOpacity
        style={[styles.button, styles.errorButton]}
        onPress={() => setShowError(true)}
      >
        <Text style={styles.buttonText}>Show Error Popup</Text>
      </TouchableOpacity>

      {/* Success Popup */}
      <StatusPopup
        visible={showSuccess}
        type="success"
        title="Operation Successful"
        description="Your action has been completed successfully. The system is now ready for the next operation."
        buttonText="Continue"
        onButtonPress={handleSuccessAction}
        onClose={() => setShowSuccess(false)}
      />

      {/* Error Popup */}
      <StatusPopup
        visible={showError}
        type="error"
        title="Operation Failed"
        description="Something went wrong during the operation. Please check your settings and try again."
        buttonText="Retry"
        onButtonPress={handleErrorAction}
        onClose={() => setShowError(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  errorButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Nunito_600SemiBold',
  },
});

export default StatusPopupExample;
