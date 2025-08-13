/**
 * Tap Placement Screen Component - Flowerpot Positioning Guide
 * 
 * This component provides an interactive guide for users to properly place
 * their flowerpot under the correct watering valve. It includes:
 * - Animated flowerpot placement demonstration
 * - Visual representation of valve and flowerpot positioning
 * - Step-by-step instructions for proper placement
 * - Confirmation flow to complete the setup
 * 
 * This screen appears after the sensor placement is completed.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Sprout } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Circle } from 'react-native-svg';
import styles from './styles';

/**
 * Convert sensor port to sensor number
 * @param {string|number} sensorPort - The sensor port (e.g., "/dev/ttyUSB0") or sensor ID
 * @returns {number} The sensor number (1 for ttyUSB0, 2 for ttyUSB1, etc.)
 */
const getSensorNumber = (sensorPort) => {
  if (typeof sensorPort === 'number') {
    return sensorPort;
  }
  
  if (typeof sensorPort === 'string') {
    // Extract number from port string (e.g., "/dev/ttyUSB0" -> 1, "/dev/ttyUSB1" -> 2)
    const match = sensorPort.match(/ttyUSB(\d+)/);
    if (match) {
      return parseInt(match[1]) + 1; // Convert 0-based to 1-based
    }
    
    // Try to extract any number from the string
    const numberMatch = sensorPort.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }
  }
  
  // Default fallback
  return 1;
};

/** ===== Valve SVG Component ===== */
function ValveSVG({ width = 120, height = 80, isActive = false }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="valveBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#1D4ED8" />
        </LinearGradient>
        <LinearGradient id="valveHandle" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#6B7280" />
          <Stop offset="1" stopColor="#4B5563" />
        </LinearGradient>
      </Defs>

      {/* Valve body */}
      <Rect x={width * 0.3} y={height * 0.2} width={width * 0.4} height={height * 0.6} rx={8} fill="url(#valveBody)" stroke="#1E40AF" strokeWidth={2} />
      
      {/* Valve handle */}
      <Rect x={width * 0.25} y={height * 0.35} width={width * 0.5} height={8} rx={4} fill="url(#valveHandle)" stroke="#374151" strokeWidth={1} />
      
      {/* Water droplet indicator */}
      {isActive && (
        <Circle cx={width * 0.5} cy={height * 0.8} r={4} fill="#10B981" />
      )}
    </Svg>
  );
}

/** ===== Planter SVG Component ===== */
function PlanterSVG({ width = 200, height = 120, soilHeight = 24, edgeToEdge = false }) {
  const boxX = edgeToEdge ? 0 : width * 0.08;
  const boxW = edgeToEdge ? width : width * 0.84;
  const lipX = edgeToEdge ? 0 : width * 0.05;
  const lipW = edgeToEdge ? width : width * 0.9;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="planter" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7a5a3c" />
          <Stop offset="1" stopColor="#5d4229" />
        </LinearGradient>
        <LinearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6a4a32" />
          <Stop offset="1" stopColor="#4a3222" />
        </LinearGradient>
      </Defs>

      {/* soft shadow */}
      <Rect x={width * 0.18} y={height - 12} width={width * 0.64} height={12} rx={6} fill="#000" opacity={0.08} />

      {/* planter */}
      <Rect x={boxX} y={height * 0.26} width={boxW} height={height * 0.56} rx={16} fill="url(#planter)" stroke="#4a3222" strokeWidth={2} />

      {/* top lip */}
      <Rect x={lipX} y={height * 0.2} width={lipW} height={20} rx={10} fill="#6b4b33" />

      {/* soil */}
      <Rect x={boxX} y={height * 0.26} width={boxW} height={soilHeight} rx={10} fill="url(#soil)" />

      {/* tiny sprout */}
      <G>
        <Path d={`M ${width * 0.50} ${height * 0.26} C ${width * 0.52} ${height * 0.20}, ${width * 0.56} ${height * 0.14}, ${width * 0.58} ${height * 0.10}`} stroke="#2f7d32" strokeWidth={6} fill="none" />
        <Path d={`M ${width * 0.48} ${height * 0.26} C ${width * 0.46} ${height * 0.20}, ${width * 0.44} ${height * 0.12}, ${width * 0.42} ${height * 0.09}`} stroke="#2f7d32" strokeWidth={5} fill="none" />
        <Path d={`M ${width * 0.58} ${height * 0.10} c 22 -10, 42 -10, 64 0 c -20 16, -44 16, -64 0 z`} fill="#3fbf52" />
        <Path d={`M ${width * 0.42} ${height * 0.09}  c -22 -8, -42 -8, -64 2 c 20 14, 44 12, 64 -2 z`} fill="#3fbf52" />
        <Path d={`M ${width * 0.50} ${height * 0.15} c 8 -10, 18 -12, 28 -10 c -8 12, -18 14, -28 10 z`} fill="#39a84a" />
      </G>
    </Svg>
  );
}

/** ===== Tap Placement Animation Component ===== */
function TapPlacementAnimation({ sensorPort, onConfirm }) {
  const planterTranslateY = useRef(new Animated.Value(100)).current;
  const planterOpacity = useRef(new Animated.Value(0)).current;
  const valveGlow = useRef(new Animated.Value(0)).current;
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Start the animation sequence
    const animationSequence = Animated.sequence([
      // Fade in and slide up the planter
      Animated.parallel([
        Animated.timing(planterOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(planterTranslateY, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      // Pulse the valve to indicate it's the correct one
      Animated.loop(
        Animated.sequence([
          Animated.timing(valveGlow, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(valveGlow, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    animationSequence.start();
    return () => animationSequence.stop();
  }, [planterTranslateY, planterOpacity, valveGlow]);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => onConfirm?.(), 450);
  };

  // Get sensor number from port
  const sensorNumber = getSensorNumber(sensorPort);

  const valveGlowOpacity = valveGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={{ width: "100%" }}>
      {/* Animation Card */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Step 2: Place Plant Under Valve</Text>
        <Text style={styles.subtitle}>Position your plant under valve #{sensorNumber} for automatic watering</Text>

        <View style={styles.animationContainer}>
          {/* Valve section */}
          <View style={styles.valveSection}>
            <Animated.View style={[styles.valveContainer, { opacity: valveGlowOpacity }]}>
              <ValveSVG width={120} height={80} isActive={true} />
            </Animated.View>
            <Text style={styles.valveLabel}>Valve #{sensorNumber}</Text>
          </View>

          {/* Connection line */}
          <View style={styles.connectionLine} />

          {/* Planter placement area */}
          <View style={styles.planterSection}>
            <Animated.View
              style={[
                styles.planterContainer,
                {
                  opacity: planterOpacity,
                  transform: [{ translateY: planterTranslateY }],
                },
              ]}
            >
              <PlanterSVG width={200} height={120} soilHeight={24} />
              <View style={styles.placementIndicator}>
                <Text style={styles.placementText}>Place here</Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Instructions Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>1. Locate valve #{sensorNumber} in your garden.</Text>
          <Text style={styles.instructionText}>2. Place the flowerpot directly under the valve.</Text>
          <Text style={styles.instructionText}>3. Ensure the pot is centered and stable.</Text>
          <Text style={styles.instructionText}>4. The valve will automatically water your plant.</Text>
        </View>

        <TouchableOpacity 
          onPress={handleConfirm} 
          style={[styles.confirmButton, confirmed && styles.confirmButtonPressed]}
          disabled={confirmed}
        >
          <Feather name={confirmed ? "check" : "check-circle"} size={20} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>
            {confirmed ? "Flowerpot placed successfully!" : "I placed the plant"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** ===== Main Component ===== */
export default function TapPlacementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [done, setDone] = useState(false);
  
  // Get sensor port from route params or use default
  const sensorPort = route.params?.sensorPort || route.params?.sensorId || "/dev/ttyUSB0";

  const handleConfirm = () => {
    setDone(true);
  };

  const handleContinue = () => {
    // Navigate back to main screen when user clicks continue
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EAF5E4' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#EAF5E4" />
      
      {/* Header with title only */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerTitleContainer}>
          <Sprout size={20} color="#4CAF50" />
          <Text style={styles.headerTitle}>Adding a New Plant</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                 {!done ? (
           <TapPlacementAnimation sensorPort={sensorPort} onConfirm={handleConfirm} />
         ) : (
           <View style={[styles.section, { alignItems: "center" }]}>
             <View style={styles.successIcon}>
               <Feather name="check" size={32} color="#FFFFFF" />
             </View>
             <Text style={[styles.sectionTitle, { marginBottom: 8, textAlign: "center" }]}>
               Setup completed successfully!
             </Text>
             <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 20 }]}>
               Your plant is now ready for automatic watering and monitoring.
             </Text>
             <TouchableOpacity 
               onPress={handleContinue} 
               style={styles.confirmButton}
             >
               <Feather name="check" size={20} color="#FFFFFF" />
               <Text style={styles.confirmButtonText}>Continue to Garden</Text>
             </TouchableOpacity>
           </View>
         )}
      </ScrollView>
    </SafeAreaView>
  );
}
