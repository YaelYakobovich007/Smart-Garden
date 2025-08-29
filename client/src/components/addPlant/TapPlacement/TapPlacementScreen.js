/**
 * Tap Placement Screen Component - Water Line Connection Guide
 * 
 * This component provides an interactive guide for users to properly place
 * their flowerpot under the correct watering valve. It includes:
 * - Animated water manifold with active valve
 * - Visual representation of valve and flowerpot positioning
 * - Step-by-step instructions for proper placement
 * - Confirmation flow to complete the setup
 * 
 * This screen appears after the sensor placement is completed.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
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
 * Convert sensor port to valve number
 * @param {string|number} sensorPort - The sensor port (e.g., "/dev/ttyUSB0") or sensor ID
 * @returns {number} The valve number (1 for ttyUSB0, 2 for ttyUSB1, etc.)
 */
const getValveNumber = (valveId, sensorPort) => {
  // Prefer explicit valveId from server
  if (typeof valveId === 'number' && valveId > 0) return valveId;
  if (typeof valveId === 'string' && /^\d+$/.test(valveId)) return parseInt(valveId);

  // Fallback to deriving from sensor port pattern
  if (typeof sensorPort === 'number') return sensorPort;
  if (typeof sensorPort === 'string') {
    const match = sensorPort.match(/ttyUSB(\d+)/);
    if (match) return parseInt(match[1]) + 1; // 0-based -> 1-based
    const numberMatch = sensorPort.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);
  }
  return 2;
};

/** ===== Planter SVG Component ===== */
function PlanterSVG({ width = 320, height = 180, soilHeight = 36, edgeToEdge = false }) {
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

/** ===== Water Manifold SVG Component ===== */
function ManifoldSVG({ width = 320, activeIndex = 2 }) {
  const height = 140;
  const tapX = (i) => (width / 6) * (i * 2 - 1);
  const ACCENT = "#42D39B";
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="pipe" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7c8a91" />
          <Stop offset="1" stopColor="#a9b3b8" />
        </LinearGradient>
        <LinearGradient id="pipeShadow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5a6a71" />
          <Stop offset="1" stopColor="#8a9aa1" />
        </LinearGradient>
      </Defs>
      
      {/* Main pipe with shadow */}
      <Rect x={12} y={20} width={width - 24} height={20} rx={10} fill="url(#pipeShadow)" opacity={0.3} />
      <Rect x={10} y={18} width={width - 20} height={18} rx={9} fill="url(#pipe)" stroke="#5a6a71" strokeWidth={1} />
      
      {/* Valve outlets */}
      {[1, 2, 3].map((idx) => (
        <G key={idx}>
          {/* Valve body */}
          <Rect x={tapX(idx) - 8} y={38} width={16} height={22} rx={4} fill="url(#pipe)" stroke="#5a6a71" strokeWidth={1} />
          {/* Valve outlet */}
          <Rect x={tapX(idx) - 12} y={60} width={24} height={12} rx={6} fill="url(#pipe)" stroke="#5a6a71" strokeWidth={1} />
          
          {/* Active valve indicator */}
          {idx === activeIndex && (
            <>
              <Circle cx={tapX(idx)} cy={72} r={18} fill="none" stroke={ACCENT} strokeWidth={4} opacity={0.8} />
              <Circle cx={tapX(idx)} cy={72} r={12} fill="none" stroke={ACCENT} strokeWidth={2} />
              <Path d={`M ${tapX(idx)} 88 l -10 -12 h20 z`} fill={ACCENT} />
              <Circle cx={tapX(idx)} cy={72} r={4} fill={ACCENT} />
            </>
          )}
        </G>
      ))}
    </Svg>
  );
}

/** ===== Tap Placement Animation Component ===== */
function TapPlacementAnimation({ sensorPort, valveId, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const valveNumber = getValveNumber(valveId, sensorPort);

  const handleConfirm = () => { 
    setConfirmed(true); 
    setTimeout(() => onConfirm?.(), 450); 
  };

  // ---- Geometry ----
  const PLANTER_H = 180;
  const SOIL_H = 36;
  const PLANTER_W = stage.w || 320;
  const BOTTOM_OFFSET = -6;

  return (
    <View style={{ width: "100%" }}>
      {/* Animation Card */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Step 2: Connect to Water Line</Text>
        <Text style={styles.subtitle}>Place the flowerpot under valve #{String(valveNumber).padStart(3, "0")} as shown</Text>

        <View
          style={styles.animationStage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setStage({ w: width, h: height });
          }}
        >
          {/* Water manifold at the top */}
          {stage.w > 0 && (
            <View style={{ position: "absolute", top: 20, left: 0, right: 0, zIndex: 3 }}>
              <ManifoldSVG width={PLANTER_W} activeIndex={valveNumber} />
            </View>
          )}
          
          {/* Planter at the bottom */}
          {stage.w > 0 && (
            <View style={{ position: "absolute", bottom: BOTTOM_OFFSET, left: 0, right: 0, zIndex: 2 }}>
              <PlanterSVG width={PLANTER_W} height={PLANTER_H} soilHeight={SOIL_H} edgeToEdge />
            </View>
          )}
        </View>
      </View>

      {/* Instructions Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>1. Move the pot directly beneath valve #{valveNumber}.</Text>
          <Text style={styles.instructionText}>2. Ensure there's a clear path for water to drip into the soil.</Text>
          <Text style={styles.instructionText}>3. Keep at least 5 cm between the valve and the plant top.</Text>
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
          <TapPlacementAnimation sensorPort={sensorPort} valveId={route.params?.valveId} onConfirm={handleConfirm} />
        ) : (
          <View style={[styles.section, { alignItems: "center" }]}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>
                         <Text style={[styles.sectionTitle, { marginBottom: 8, textAlign: "center" }]}>
               Plant added successfully!
             </Text>
            <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 20 }]}>
              You can go back to the main screen or add another plant.
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
