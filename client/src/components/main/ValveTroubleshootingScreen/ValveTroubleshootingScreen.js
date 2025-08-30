import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import websocketService from '../../../services/websocketService';
import { styles } from './styles';

const ValveTroubleshootingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plantName } = route.params;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const troubleshootingSteps = [
    {
      id: 1,
      title: 'Check Physical Connections',
      description: 'Ensure all cables and hoses are properly connected',
      checks: [
        'Verify the valve is securely connected to the water supply',
        'Check that the power cable is properly plugged in',
        'Ensure the control cable is connected to the Raspberry Pi',
        'Look for any visible damage to cables or connectors'
      ]
    },
    {
      id: 2,
      title: 'Inspect Water Supply',
      description: 'Make sure water is flowing to the valve',
      checks: [
        'Check that the main water supply is turned on',
        'Verify there are no kinks in the water hoses',
        'Ensure the water pressure is adequate',
        'Look for any leaks around the valve connections'
      ]
    },
    {
      id: 3,
      title: 'Check Valve Mechanism',
      description: 'Inspect the valve for physical obstructions',
      checks: [
        'Look for any debris blocking the valve opening',
        'Check if the valve handle moves freely',
        'Ensure no foreign objects are stuck in the valve',
        'Verify the valve is not frozen or stuck'
      ]
    },
    {
      id: 4,
      title: 'Test Electrical Components',
      description: 'Verify the electrical system is working',
      checks: [
        'Check that the Raspberry Pi is powered on',
        'Verify the relay module is receiving power',
        'Ensure all LED indicators are functioning',
        'Test the valve with manual override if available'
      ]
    }
  ];

  const handleStepComplete = () => {
    if (currentStep < troubleshootingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed, show unblock option
      setCurrentStep(troubleshootingSteps.length);
    }
  };

  const handleUnblockValve = async () => {
    setIsUnblocking(true);
    
    try {
      if (websocketService.isConnected()) {
        // Listen once for success/fail, then navigate back
        const onSuccess = (msg) => {
          websocketService.offMessage('RESTART_VALVE_SUCCESS', onSuccess);
          websocketService.offMessage('RESTART_VALVE_FAIL', onFail);
          setIsUnblocking(false);
          navigation.goBack();
        };
        const onFail = (msg) => {
          websocketService.offMessage('RESTART_VALVE_SUCCESS', onSuccess);
          websocketService.offMessage('RESTART_VALVE_FAIL', onFail);
          setIsUnblocking(false);
          navigation.goBack();
        };
        websocketService.onMessage('RESTART_VALVE_SUCCESS', onSuccess);
        websocketService.onMessage('RESTART_VALVE_FAIL', onFail);
        // Use RESTART_VALVE flow to clear blocked state via Pi
        websocketService.sendMessage({ type: 'RESTART_VALVE', plantName });
      } else {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the system. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        setIsUnblocking(false);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to unblock valve. Please try again.',
        [{ text: 'OK' }]
      );
      setIsUnblocking(false);
    }
  };

  const renderStep = (step, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;

    return (
      <View key={step.id} style={[styles.stepContainer, isActive && styles.activeStep]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumber, isCompleted && styles.completedStep]}>
            {isCompleted ? (
              <Feather name="check" size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.stepNumberText}>{step.id}</Text>
            )}
          </View>
          <View style={styles.stepTitleContainer}>
            <Text style={[styles.stepTitle, isActive && styles.activeStepTitle]}>
              {step.title}
            </Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        </View>

        {isActive && (
          <View style={styles.checksContainer}>
            <Text style={styles.checksTitle}>Please check the following:</Text>
            {step.checks.map((check, checkIndex) => (
              <View key={checkIndex} style={styles.checkItem}>
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={styles.checkText}>{check}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.completeStepButton}
              onPress={handleStepComplete}
            >
              <Text style={styles.completeStepButtonText}>I've Checked Everything</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderUnblockSection = () => (
    <View style={styles.unblockSection}>
      <View style={styles.unblockHeader}>
        <Feather name="check-circle" size={48} color="#10B981" />
        <Text style={styles.unblockTitle}>All Checks Complete!</Text>
        <Text style={styles.unblockDescription}>
          You've completed all the troubleshooting steps. If you've resolved any issues, 
          you can now unblock the valve for "{plantName}".
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
        onPress={handleUnblockValve}
        disabled={isUnblocking}
      >
        <Feather name="unlock" size={20} color="#FFFFFF" />
        <Text style={styles.unblockButtonText}>
          {isUnblocking ? 'Unblocking...' : 'Turn On Tap'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.plantInfo}>
          <Feather name="alert-triangle" size={32} color="#F59E0B" />
          <Text style={styles.plantName}>{plantName}</Text>
          <Text style={styles.plantStatus}>Tap is currently blocked</Text>
        </View>

        <View style={styles.stepsContainer}>
          {troubleshootingSteps.map((step, index) => renderStep(step, index))}
          {currentStep === troubleshootingSteps.length && renderUnblockSection()}
        </View>
      </ScrollView>
    </View>
  );
};

export default ValveTroubleshootingScreen;
