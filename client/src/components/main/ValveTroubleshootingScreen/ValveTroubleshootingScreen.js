import React, { useEffect, useState } from 'react';
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
  const [diagRunning, setDiagRunning] = useState(false);
  const [diag, setDiag] = useState({
    sensor: { status: 'pending', details: null },
    valve: { status: 'pending', details: null }
  });

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

  // Diagnostics handlers
  useEffect(() => {
    const onSensorOk = (msg) => {
      setDiag((prev) => ({ ...prev, sensor: { status: 'success', details: msg } }));
      // Next step: valve check
      websocketService.checkValveMechanism(plantName);
    };
    const onSensorFail = (msg) => {
      setDiag((prev) => ({ ...prev, sensor: { status: 'fail', details: msg } }));
      // Still proceed to valve check to give more info
      websocketService.checkValveMechanism(plantName);
    };
    const onValveOk = (msg) => {
      setDiag((prev) => ({ ...prev, valve: { status: 'success', details: msg } }));
      setDiagRunning(false);
    };
    const onValveFail = (msg) => {
      setDiag((prev) => ({ ...prev, valve: { status: 'fail', details: msg } }));
      setDiagRunning(false);
    };

    websocketService.onMessage('CHECK_SENSOR_CONNECTION_SUCCESS', onSensorOk);
    websocketService.onMessage('CHECK_SENSOR_CONNECTION_FAIL', onSensorFail);
    websocketService.onMessage('CHECK_VALVE_MECHANISM_SUCCESS', onValveOk);
    websocketService.onMessage('CHECK_VALVE_MECHANISM_FAIL', onValveFail);

    return () => {
      websocketService.offMessage('CHECK_SENSOR_CONNECTION_SUCCESS', onSensorOk);
      websocketService.offMessage('CHECK_SENSOR_CONNECTION_FAIL', onSensorFail);
      websocketService.offMessage('CHECK_VALVE_MECHANISM_SUCCESS', onValveOk);
      websocketService.offMessage('CHECK_VALVE_MECHANISM_FAIL', onValveFail);
    };
  }, [plantName]);

  const startDiagnostics = () => {
    if (!websocketService.isConnected()) {
      Alert.alert('Connection Error', 'Unable to connect to the system. Please try again later.', [{ text: 'OK' }]);
      return;
    }
    setDiag({ sensor: { status: 'running', details: null }, valve: { status: 'pending', details: null } });
    setDiagRunning(true);
    websocketService.checkSensorConnection(plantName);
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

        {/* Automated diagnostics */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, (diag.sensor.status === 'success') && styles.completedStep]}>
                {diag.sensor.status === 'success' ? (
                  <Feather name="check" size={20} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumberText}>S</Text>
                )}
              </View>
              <View style={styles.stepTitleContainer}>
                <Text style={styles.stepTitle}>Sensor Connection</Text>
                <Text style={styles.stepDescription}>
                  {diag.sensor.status === 'pending' && 'Pending'}
                  {diag.sensor.status === 'running' && 'Checking...'}
                  {diag.sensor.status === 'success' && 'OK'}
                  {diag.sensor.status === 'fail' && 'Failed'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, (diag.valve.status === 'success') && styles.completedStep]}>
                {diag.valve.status === 'success' ? (
                  <Feather name="check" size={20} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumberText}>V</Text>
                )}
              </View>
              <View style={styles.stepTitleContainer}>
                <Text style={styles.stepTitle}>Valve Mechanism</Text>
                <Text style={styles.stepDescription}>
                  {diag.valve.status === 'pending' && 'Pending'}
                  {diag.valve.status === 'running' && 'Checking...'}
                  {diag.valve.status === 'success' && 'OK'}
                  {diag.valve.status === 'fail' && 'Issue detected'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.completeStepButton, diagRunning && styles.unblockButtonDisabled]}
            onPress={startDiagnostics}
            disabled={diagRunning}
          >
            <Text style={styles.completeStepButtonText}>{diagRunning ? 'Running…' : 'Start Diagnostics'}</Text>
          </TouchableOpacity>
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
