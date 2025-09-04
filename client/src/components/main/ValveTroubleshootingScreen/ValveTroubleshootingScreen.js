import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  Droplets, 
  Settings, 
  Wrench, 
  RefreshCw,
  Zap,
  Shield,
  Activity
} from 'lucide-react-native';
import { styles } from './styles';
import { websocketService } from '../../../services/websocketService';

const { width } = Dimensions.get('window');

const ValveTroubleshootingScreen = ({ route }) => {
  const navigation = useNavigation();
  const { plant } = route.params;
  
  const [diagnosticSteps, setDiagnosticSteps] = useState([
    {
      id: 'sensor',
      title: 'Sensor Connection',
      description: 'Verifying moisture sensor connectivity',
      icon: <Wifi size={24} color="#3B82F6" />,
      status: 'pending'
    },
    {
      id: 'valve',
      title: 'Valve Mechanism',
      description: 'Testing valve open/close functionality',
      icon: <Droplets size={24} color="#3B82F6" />,
      status: 'pending'
    },
    {
      id: 'power',
      title: 'Power Supply',
      description: 'Checking system power stability',
      icon: <Zap size={24} color="#3B82F6" />,
      status: 'pending'
    }
  ]);

  const [manualChecks, setManualChecks] = useState({
    sensorPlacement: false,
    pipeIntegrity: false
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsComplete, setDiagnosticsComplete] = useState(false);
  const [rotationAnim] = useState(new Animated.Value(0));

  const DELAY_BEFORE_STEP_MS = 800;
  const DELAY_BETWEEN_STEPS_MS = 1800;

  useEffect(() => {
    if (diagnosticsRunning) {
      const startRotation = () => {
        rotationAnim.setValue(0);
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }).start(() => startRotation());
      };
      startRotation();
    } else {
      rotationAnim.stopAnimation();
    }
  }, [diagnosticsRunning]);

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const runDiagnostics = async () => {
    const allManualChecksConfirmed = Object.values(manualChecks).every(check => check);
    
    if (!allManualChecksConfirmed) {
      Alert.alert(
        'Manual Checks Required',
        'Please confirm all manual checks before running diagnostics.',
        [{ text: 'OK' }]
      );
      return;
    }

    setDiagnosticsRunning(true);
    setDiagnosticsComplete(false);

    for (let i = 0; i < diagnosticSteps.length; i++) {
      setCurrentStep(i);
      
      // Update step to checking
      setDiagnosticSteps(prev => 
        prev.map((step, index) => 
          index === i ? { ...step, status: 'checking' } : step
        )
      );

      await new Promise(resolve => setTimeout(resolve, DELAY_BEFORE_STEP_MS));

      try {
        let success = false;
        
        switch (diagnosticSteps[i].id) {
          case 'sensor':
            success = await websocketService.checkSensorConnection(plant.name);
            break;
          case 'valve':
            success = await websocketService.checkValveMechanism(plant.name);
            break;
          case 'power':
            success = await websocketService.checkPowerSupply(plant.name);
            break;
        }

        // Update step result
        setDiagnosticSteps(prev => 
          prev.map((step, index) => 
            index === i ? { ...step, status: success ? 'passed' : 'failed' } : step
          )
        );

        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_STEPS_MS));
      } catch (error) {
        setDiagnosticSteps(prev => 
          prev.map((step, index) => 
            index === i ? { ...step, status: 'failed' } : step
          )
        );
      }
    }

    setDiagnosticsRunning(false);
    setDiagnosticsComplete(true);
  };

  const handleUnblockValve = async () => {
    try {
      await websocketService.sendMessage('RESTART_VALVE', { plant_name: plant.name });
      Alert.alert(
        'Success',
        'Valve has been unblocked successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock valve. Please try again.');
    }
  };

  const toggleManualCheck = (key) => {
    setManualChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetDiagnostics = () => {
    setDiagnosticSteps(prev => 
      prev.map(step => ({ ...step, status: 'pending' }))
    );
    setCurrentStep(0);
    setDiagnosticsComplete(false);
    setDiagnosticsRunning(false);
  };

  const allStepsPassed = diagnosticsComplete && diagnosticSteps.every(step => step.status === 'passed');
  const hasFailedSteps = diagnosticsComplete && diagnosticSteps.some(step => step.status === 'failed');

  const renderIcon = (step) => {
    if (step.status === 'checking') {
      return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={24} color="#3B82F6" />
        </Animated.View>
      );
    } else if (step.status === 'passed') {
      return <CheckCircle size={24} color="#10B981" />;
    } else if (step.status === 'failed') {
      return <XCircle size={24} color="#EF4444" />;
    } else {
      return step.icon;
    }
  };

  const getStepStatusColor = (status) => {
    switch (status) {
      case 'checking': return '#DBEAFE';
      case 'passed': return '#D1FAE5';
      case 'failed': return '#FEE2E2';
      default: return '#F9FAFB';
    }
  };

  const getStepTextColor = (status) => {
    switch (status) {
      case 'checking': return '#1E40AF';
      case 'passed': return '#065F46';
      case 'failed': return '#991B1B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Problem Overview Card */}
        <View style={styles.problemCard}>
          <View style={styles.problemHeader}>
            <View style={styles.problemIconContainer}>
              <AlertTriangle size={28} color="#F59E0B" />
            </View>
            <View style={styles.problemTextContainer}>
              <Text style={styles.problemTitle}>Irrigation System Issue</Text>
              <Text style={styles.problemDescription}>
                {plant.name} irrigation system requires diagnostic testing
              </Text>
            </View>
          </View>
        </View>

        {/* Manual Checks Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Pre-Diagnostic Checks</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Please verify these manual checks before running automated diagnostics
          </Text>
          
          <View style={styles.manualChecksContainer}>
            <TouchableOpacity
              style={[
                styles.manualCheckItem,
                manualChecks.sensorPlacement && styles.manualCheckItemChecked
              ]}
              onPress={() => toggleManualCheck('sensorPlacement')}
            >
              <View style={[
                styles.checkBadge,
                manualChecks.sensorPlacement && styles.checkBadgeChecked
              ]}>
                {manualChecks.sensorPlacement && <CheckCircle size={16} color="#FFFFFF" />}
              </View>
              <View style={styles.manualCheckText}>
                <Text style={styles.manualCheckTitle}>Sensor Placement</Text>
                <Text style={styles.manualCheckDescription}>
                  Sensor is properly positioned and secure
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.manualCheckItem,
                manualChecks.pipeIntegrity && styles.manualCheckItemChecked
              ]}
              onPress={() => toggleManualCheck('pipeIntegrity')}
            >
              <View style={[
                styles.checkBadge,
                manualChecks.pipeIntegrity && styles.checkBadgeChecked
              ]}>
                {manualChecks.pipeIntegrity && <CheckCircle size={16} color="#FFFFFF" />}
              </View>
              <View style={styles.manualCheckText}>
                <Text style={styles.manualCheckTitle}>Pipe Integrity</Text>
                <Text style={styles.manualCheckDescription}>
                  No visible leaks or pipe damage
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnostic Steps Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Automated Diagnostics</Text>
            {diagnosticsComplete && (
              <TouchableOpacity onPress={resetDiagnostics} style={styles.resetButton}>
                <RefreshCw size={16} color="#3B82F6" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.diagnosticStepsContainer}>
            {diagnosticSteps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.diagnosticStepCard,
                  { backgroundColor: getStepStatusColor(step.status) }
                ]}
              >
                <View style={styles.stepIconContainer}>
                  {renderIcon(step)}
                </View>
                
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepTitle,
                    { color: getStepTextColor(step.status) }
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={[
                    styles.stepDescription,
                    { color: getStepTextColor(step.status) }
                  ]}>
                    {step.status === 'checking' ? 'Running test...' :
                     step.status === 'passed' ? 'Test completed successfully' :
                     step.status === 'failed' ? 'Test failed - manual intervention needed' :
                     step.description}
                  </Text>
                </View>

                <View style={[
                  styles.stepStatusBadge,
                  { backgroundColor: step.status === 'passed' ? '#10B981' : 
                                   step.status === 'failed' ? '#EF4444' :
                                   step.status === 'checking' ? '#3B82F6' : '#9CA3AF' }
                ]}>
                  <Text style={styles.stepStatusText}>
                    {step.status === 'checking' ? 'Testing' :
                     step.status === 'passed' ? 'Passed' :
                     step.status === 'failed' ? 'Failed' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {!diagnosticsRunning && !diagnosticsComplete && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={runDiagnostics}
              disabled={!Object.values(manualChecks).every(check => check)}
            >
              <Wrench size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start Diagnostics</Text>
            </TouchableOpacity>
          )}

          {diagnosticsRunning && (
            <View style={styles.runningContainer}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={20} color="#3B82F6" />
              </Animated.View>
              <Text style={styles.runningText}>
                Running Diagnostics... ({currentStep + 1}/{diagnosticSteps.length})
              </Text>
            </View>
          )}

          {allStepsPassed && (
            <View style={styles.resultContainer}>
              <View style={styles.successCard}>
                <View style={styles.successIconContainer}>
                  <CheckCircle size={32} color="#10B981" />
                </View>
                <View style={styles.successTextContainer}>
                  <Text style={styles.successTitle}>All Systems Operational</Text>
                  <Text style={styles.successDescription}>
                    All diagnostic tests passed successfully. Your irrigation system is ready to function normally.
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.successButton}
                onPress={handleUnblockValve}
              >
                <Droplets size={20} color="#FFFFFF" />
                <Text style={styles.successButtonText}>Activate Irrigation System</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasFailedSteps && (
            <View style={styles.resultContainer}>
              <View style={styles.errorCard}>
                <View style={styles.errorIconContainer}>
                  <XCircle size={32} color="#EF4444" />
                </View>
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorTitle}>Issues Detected</Text>
                  <Text style={styles.errorDescription}>
                    Some diagnostic tests failed. Please check the failed components and try again.
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.warningButton}
                onPress={handleUnblockValve}
              >
                <AlertTriangle size={20} color="#FFFFFF" />
                <Text style={styles.warningButtonText}>Force Activate (Use with Caution)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ValveTroubleshootingScreen;
