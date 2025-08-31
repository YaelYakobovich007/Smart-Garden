import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import websocketService from '../../../services/websocketService';
import { styles } from './styles';

const ValveTroubleshootingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plantName } = route.params;
  
  const [isUnblocking, setIsUnblocking] = useState(false);

  // New diagnostics state aligned with the provided example
  const [diagnosticSteps, setDiagnosticSteps] = useState([
    {
      id: 'sensor',
      title: 'Sensor Connection',
      description: 'Check if the moisture sensor is properly connected',
      icon: 'wifi',
      completed: false,
      status: 'pending'
    },
    {
      id: 'valve',
      title: 'Valve Mechanism',
      description: 'Verify the valve can open and close properly',
      icon: 'droplet',
      completed: false,
      status: 'pending'
    },
    {
      id: 'power',
      title: 'Power Supply',
      description: 'Ensure adequate power supply to the irrigation system',
      icon: 'settings',
      completed: false,
      status: 'pending'
    }
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsComplete, setDiagnosticsComplete] = useState(false);
  const [manualChecks, setManualChecks] = useState({ sensorPlaced: false, noPipeRupture: false });

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

  // Helper to await one of two message types once
  const waitForMessage = (successType, failType) => new Promise((resolve) => {
    const onSuccess = (msg) => {
      websocketService.offMessage(successType, onSuccess);
      websocketService.offMessage(failType, onFail);
      resolve({ ok: true, msg });
    };
    const onFail = (msg) => {
      websocketService.offMessage(successType, onSuccess);
      websocketService.offMessage(failType, onFail);
      resolve({ ok: false, msg });
    };
    websocketService.onMessage(successType, onSuccess);
    websocketService.onMessage(failType, onFail);
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Tunable delays
  const DELAY_BEFORE_STEP_MS = 800;       // small pause after showing "Checking..."
  const DELAY_BETWEEN_STEPS_MS = 1800;    // longer pause between steps

  // Run diagnostics sequentially like the provided example (first two are real checks)
  const runDiagnostics = async () => {
    if (!websocketService.isConnected()) {
      Alert.alert('Connection Error', 'Unable to connect to the system. Please try again later.', [{ text: 'OK' }]);
      return;
    }

    setDiagnosticsRunning(true);
    setDiagnosticsComplete(false);
    setCurrentStep(0);
    setDiagnosticSteps((prev) => prev.map((s) => ({ ...s, completed: false, status: 'pending' })));

    // Record that user confirmed manual checks (no server call needed)
    // If not confirmed defensively, stop and prompt
    if (!manualChecks.sensorPlaced || !manualChecks.noPipeRupture) {
      setDiagnosticsRunning(false);
      Alert.alert('Complete Manual Checks', 'Please confirm the sensor is in place and there is no pipe rupture.', [{ text: 'OK' }]);
      return;
    }

    const steps = ['sensor', 'valve', 'power'];
    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      setCurrentStep(i);
      setDiagnosticSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: 'checking' } : s)));
      await sleep(DELAY_BEFORE_STEP_MS);

      if (stepId === 'sensor') {
        websocketService.checkSensorConnection(plantName);
        const res = await waitForMessage('CHECK_SENSOR_CONNECTION_SUCCESS', 'CHECK_SENSOR_CONNECTION_FAIL');
        setDiagnosticSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: res.ok ? 'passed' : 'failed', completed: true } : s)));
      } else if (stepId === 'valve') {
        websocketService.checkValveMechanism(plantName);
        const res = await waitForMessage('CHECK_VALVE_MECHANISM_SUCCESS', 'CHECK_VALVE_MECHANISM_FAIL');
        setDiagnosticSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: res.ok ? 'passed' : 'failed', completed: true } : s)));
      } else if (stepId === 'power') {
        websocketService.checkPowerSupply(plantName);
        const res = await waitForMessage('CHECK_POWER_SUPPLY_SUCCESS', 'CHECK_POWER_SUPPLY_FAIL');
        setDiagnosticSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: res.ok ? 'passed' : 'failed', completed: true } : s)));
      }

      // Inter-step pause for better UX pacing (skip after last step)
      if (i < steps.length - 1) {
        await sleep(DELAY_BETWEEN_STEPS_MS);
      }
    }

    setDiagnosticsRunning(false);
    setDiagnosticsComplete(true);
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

  const allStepsPassed = diagnosticsComplete && diagnosticSteps.every((s) => s.status === 'passed');
  const hasFailedSteps = diagnosticsComplete && diagnosticSteps.some((s) => s.status === 'failed');

  const renderStatusStyles = (status) => {
    if (status === 'checking') return { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' };
    // Use the same green vibe as "open valve" (PlantDetail uses #4CAF50 family)
    if (status === 'passed') return { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' };
    if (status === 'failed') return { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' };
    return { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' };
  };

  const Rotating = ({ children }) => {
    const rotate = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [rotate]);
    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return <Animated.View style={{ transform: [{ rotate: spin }] }}>{children}</Animated.View>;
  };

  const renderIcon = (status, icon) => {
    if (status === 'checking') return (
      <Rotating>
        <Feather name="refresh-ccw" size={20} color="#2563EB" />
      </Rotating>
    );
    if (status === 'passed') return <Feather name="check-circle" size={20} color="#059669" />;
    if (status === 'failed') return <Feather name="x-circle" size={20} color="#DC2626" />;
    return <Feather name={icon} size={20} color="#6B7280" />;
  };

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
        <View style={[styles.banner, styles.bannerAmber]}>
          <View style={styles.bannerRow}>
            <Feather name="alert-triangle" size={24} color="#92400E" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.bannerTitle}>Valve System Issue</Text>
              <Text style={styles.bannerText}>The irrigation system for {plantName} appears to be blocked or malfunctioning.</Text>
            </View>
          </View>
        </View>

        <View style={[styles.banner, styles.bannerBlue]}>
          <Text style={[styles.bannerTitle, { color: '#1E3A8A', marginBottom: 6 }]}>Before Starting Diagnostics</Text>
          <Text style={[styles.bannerText, { marginBottom: 8 }]}>Please ensure you can physically access your garden setup. The diagnostic will check:</Text>
          <Text style={styles.bannerBullet}>• Sensor connections and readings</Text>
          <Text style={styles.bannerBullet}>• Valve mechanism functionality</Text>
          <Text style={styles.bannerBullet}>• Power supply status</Text>
          {/* Blockage step removed */}
        </View>

        {/* Manual Checks Section (moved after blue instructions) */}
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Manual Checks</Text>
          <View style={[styles.manualRow, manualChecks.sensorPlaced && styles.manualRowChecked]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.manualItemTitle}>Sensor is properly placed</Text>
              <Text style={styles.manualItemText}>Confirm the moisture sensor is firmly inserted and hasn’t fallen out.</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setManualChecks((prev) => ({ ...prev, sensorPlaced: !prev.sensorPlaced }))}
              style={[styles.manualBadge, manualChecks.sensorPlaced && styles.manualBadgeChecked]}
            >
              {manualChecks.sensorPlaced ? (
                <Feather name="check" size={16} color="#FFFFFF" />
              ) : (
                <Feather name="check" size={16} color="#F59E0B" />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.manualDivider} />
          <View style={[styles.manualRow, manualChecks.noPipeRupture && styles.manualRowChecked]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.manualItemTitle}>No pipe rupture or leaks</Text>
              <Text style={styles.manualItemText}>Inspect the water line to ensure it hasn’t burst and there are no leaks.</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setManualChecks((prev) => ({ ...prev, noPipeRupture: !prev.noPipeRupture }))}
              style={[styles.manualBadge, manualChecks.noPipeRupture && styles.manualBadgeChecked]}
            >
              {manualChecks.noPipeRupture ? (
                <Feather name="check" size={16} color="#FFFFFF" />
              ) : (
                <Feather name="check" size={16} color="#F59E0B" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnostic Steps (visuals adapted to the example) */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>Diagnostic Steps</Text>
            {diagnosticsComplete && (
              <TouchableOpacity onPress={() => {
                setDiagnosticSteps((prev) => prev.map((s) => ({ ...s, completed: false, status: 'pending' })));
                setDiagnosticsComplete(false);
                setDiagnosticsRunning(false);
                setCurrentStep(0);
              }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Feather name="refresh-ccw" size={16} color="#2563EB" />
                <Text style={{ color: '#2563EB', fontWeight: '600', marginLeft: 6 }}>Run Again</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 16 }}>
            {diagnosticSteps.map((step, index) => (
              <View key={step.id} style={[styles.stepContainer, { borderWidth: 2, ...renderStatusStyles(step.status) }]}>
                <View style={styles.stepHeader}>
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: (
                    step.status === 'checking' ? '#DBEAFE' : step.status === 'passed' ? '#DBEAFE' : step.status === 'failed' ? '#FECACA' : '#F3F4F6'
                  ) }}>
                    {renderIcon(step.status, step.icon)}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: 18, color: (
                      step.status === 'passed' ? '#065F46' : step.status === 'failed' ? '#991B1B' : step.status === 'checking' ? '#1E40AF' : '#111827'
                    )}}>
                      {step.title}
                    </Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: (
                      step.status === 'passed' ? '#047857' : step.status === 'failed' ? '#B91C1C' : step.status === 'checking' ? '#1D4ED8' : '#6B7280'
                    )}}>
                      {step.status === 'checking' ? 'Checking...' :
                       step.status === 'passed' ? 'Connection verified and working properly' :
                       step.status === 'failed' ? 'Issue detected - manual intervention required' :
                       step.description}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: (
                    step.status === 'passed' ? '#A7F3D0' : step.status === 'failed' ? '#FECACA' : step.status === 'checking' ? '#BFDBFE' : '#E5E7EB'
                  ) }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: (
                      step.status === 'passed' ? '#065F46' : step.status === 'failed' ? '#991B1B' : step.status === 'checking' ? '#1E40AF' : '#374151'
                    )}}>
                      {step.status === 'checking' ? 'Testing' : step.status === 'passed' ? 'Passed' : step.status === 'failed' ? 'Failed' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ marginTop: 16, gap: 12 }}>
          {!diagnosticsRunning && !diagnosticsComplete && (
            <TouchableOpacity
              onPress={runDiagnostics}
              style={{ backgroundColor: (!manualChecks.sensorPlaced || !manualChecks.noPipeRupture) ? '#FCD34D' : '#F59E0B', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
              disabled={!manualChecks.sensorPlaced || !manualChecks.noPipeRupture}
            >
              <Feather name="tool" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }}>
                {(!manualChecks.sensorPlaced || !manualChecks.noPipeRupture) ? 'Complete Manual Checks First' : 'Start Diagnostics'}
              </Text>
            </TouchableOpacity>
          )}

          {diagnosticsRunning && (
            <View style={{ backgroundColor: '#DBEAFE', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Feather name="refresh-ccw" size={20} color="#1E40AF" />
              <Text style={{ color: '#1E40AF', fontWeight: '600', marginLeft: 8 }}>Running Diagnostics... ({currentStep + 1}/{diagnosticSteps.length})</Text>
            </View>
          )}

          {allStepsPassed && (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="check-circle" size={20} color="#F59E0B" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: '600', color: '#92400E' }}>All Systems Clear</Text>
                    <Text style={{ fontSize: 12, color: '#92400E' }}>All diagnostic checks passed. The system should be ready to function normally.</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={handleUnblockValve} style={{ backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Feather name="droplet" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }}>Activate Irrigation System</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasFailedSteps && (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 12, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="x-circle" size={20} color="#DC2626" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: '600', color: '#991B1B' }}>Issues Detected</Text>
                    <Text style={{ fontSize: 12, color: '#B91C1C' }}>Some diagnostic checks failed. Please check the failed components and try again.</Text>
                  </View>
                </View>
        </View>

              <TouchableOpacity onPress={handleUnblockValve} style={{ backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                <Feather name="alert-triangle" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }}>Force Activate (Use with Caution)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ValveTroubleshootingScreen;
