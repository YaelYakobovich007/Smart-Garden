/**
 * Sensor Placement Screen Component - Sensor Installation Guide
 * 
 * This component provides an interactive guide for users to properly place
 * their soil moisture sensor in the plant pot. It includes:
 * - Animated sensor placement demonstration
 * - Step-by-step instructions
 * - Visual feedback for proper sensor positioning
 * - Confirmation flow to proceed to plant setup
 * 
 * The component is part of the plant addition flow and ensures
 * proper sensor installation for accurate moisture readings.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import styles from './styles';

/** ===== Theme ===== */
const APP_BG = "#EAF7EF";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#243B41";
const SUBTEXT = "#6C7A80";
const ACCENT = "#42D39B";

/** ===== Stepper Component ===== */
function Stepper({ total = 2, current = 1 }) {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <View style={styles.stepperRow}>
      {items.map((n, idx) => (
        <React.Fragment key={n}>
          <View style={[styles.stepDot, n <= current ? styles.stepDotActive : styles.stepDotInactive]} />
          {idx < items.length - 1 && (
            <View style={[styles.stepLine, n < current ? styles.stepLineActive : styles.stepLineInactive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/** ===== Sensor SVG Component ===== */
function SensorSVG({ width = 170 }) {
  const aspect = 1.4;
  const height = width * aspect;
  const bodyW = width * 0.52;
  const bodyH = height * 0.48;
  const bodyX = (width - bodyW) / 2;
  const bodyY = height * 0.12;
  const r = 12;

  const pinTop = bodyY + bodyH - 4;
  const pinGap = bodyW / 5;
  const pinLen = height * 0.42;
  const pin1x = bodyX + pinGap;
  const pin2x = bodyX + bodyW / 2;
  const pin3x = bodyX + bodyW - pinGap;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#cfd3d6" />
          <Stop offset="0.5" stopColor="#9aa0a6" />
          <Stop offset="1" stopColor="#e6eaed" />
        </LinearGradient>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#121416" />
          <Stop offset="1" stopColor="#1b1e22" />
        </LinearGradient>
      </Defs>

      {/* cable */}
      <Path
        d={`
          M ${width * 0.1} ${bodyY - 6}
          C ${width * 0.02} ${bodyY - 28}, ${width * 0.05} ${bodyY - 56}, ${width * 0.26} ${bodyY - 64}
          S ${width * 0.72} ${bodyY - 66}, ${width * 0.62} ${bodyY - 16}
        `}
        stroke="#0f1113"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />

      {/* body shadow */}
      <Rect x={bodyX + 4} y={bodyY + 6} rx={r} ry={r} width={bodyW} height={bodyH} fill="#000" opacity={0.2} />

      {/* body */}
      <Rect x={bodyX} y={bodyY} rx={r} ry={r} width={bodyW} height={bodyH} fill="url(#bodyGrad)" stroke="#090b0d" strokeWidth={2} />
      {/* neck */}
      <Rect x={bodyX + bodyW * 0.42} y={bodyY - 10} width={bodyW * 0.16} height={14} rx={6} ry={6} fill="#141518" stroke="#0d0f12" strokeWidth={1} />

      {/* label */}
      <Rect x={bodyX + 10} y={bodyY + 10} width={bodyW - 20} height={bodyH * 0.46} rx={6} ry={6} fill="#eef2f4" stroke="#cfd8dc" strokeWidth={1} />
      <G stroke="#9aa0a6" strokeWidth={1.4}>
        <Path d={`M ${bodyX + 16} ${bodyY + 24} H ${bodyX + bodyW - 16}`} />
        <Path d={`M ${bodyX + 16} ${bodyY + 34} H ${bodyX + bodyW - 38}`} />
        <Path d={`M ${bodyX + 16} ${bodyY + 44} H ${bodyX + bodyW - 52}`} />
      </G>

      {/* pins */}
      <Rect x={pin1x - 3} y={pinTop} width={6} height={pinLen} rx={3} fill="url(#steel)" stroke="#7f8c8d" strokeWidth={0.6} />
      <Rect x={pin2x - 3} y={pinTop} width={6} height={pinLen} rx={3} fill="url(#steel)" stroke="#7f8c8d" strokeWidth={0.6} />
      <Rect x={pin3x - 3} y={pinTop} width={6} height={pinLen} rx={3} fill="url(#steel)" stroke="#7f8c8d" strokeWidth={0.6} />
    </Svg>
  );
}

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

/** ===== Sensor Placement Flow Component ===== */
function PlaceSensorFlow({ sensorId, onConfirm }) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const [confirmed, setConfirmed] = useState(false);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, { toValue: 8, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -10, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [translateY, rotate]);

  const rotateDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
  const handleConfirm = () => { 
    setConfirmed(true); 
    setTimeout(() => onConfirm?.(), 450); 
  };

  // ---- Geometry ----
  const PLANTER_H = 180;
  const SOIL_H = 36;
  const PLANTER_W = stage.w || 320;

  // "צמוד לתחתית": דוחפים את האדנית למטה טיפונת (שלילי = עוד יותר צמוד)
  const BOTTOM_OFFSET = -6;

  // קו האדמה למסכה (בהתאם ל-offset)
  const SOIL_TOP_FROM_BOTTOM = BOTTOM_OFFSET + PLANTER_H - SOIL_H;

  // מיקום החיישן
  const SENSOR_Y_ADJUST = -8;

  return (
    <View style={{ width: "100%" }}>
      {/* כרטיס האנימציה */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 1: Place Your Sensor</Text>
        <Text style={styles.cardSubtitle}>Insert sensor #{String(sensorId).padStart(3, "0")} into the flowerpot as shown below</Text>

        <View
          style={styles.stage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setStage({ w: width, h: height });
          }}
        >
          {/* אדנית בקצה התחתון של האנימציה */}
          {stage.w > 0 && (
            <View style={{ position: "absolute", bottom: BOTTOM_OFFSET, left: 0, right: 0, zIndex: 2 }}>
              <PlanterSVG width={PLANTER_W} height={PLANTER_H} soilHeight={SOIL_H} edgeToEdge />
            </View>
          )}

          {/* מסכה ברוחב מלא – החיישן "נכנס" לאדמה */}
          {stage.w > 0 && (
            <View
              style={{
                position: "absolute",
                bottom: SOIL_TOP_FROM_BOTTOM,
                left: 0,
                right: 0,
                height: 120,
                overflow: "hidden",
                zIndex: 3,
              }}
            >
              <Animated.View
                style={{
                  position: "absolute",
                  right: 30,
                  bottom: SENSOR_Y_ADJUST,
                  transform: [{ translateY }, { rotate: rotateDeg }],
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <SensorSVG width={170} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{String(sensorId)}</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </View>

      {/* כרטיס הוראות */}
      <View style={[styles.card, { marginTop: 28 }]}>
        <Text style={styles.cardTitle}>Instructions</Text>
        <Text style={styles.instructions}>1. Remove the sensor from its packaging.</Text>
        <Text style={styles.instructions}>2. Gently insert it into the soil.</Text>
        <Text style={styles.instructions}>3. Ensure the sensor is 2–3 cm deep.</Text>
        <Text style={styles.instructions}>4. The sensor should be stable and upright.</Text>

        <Pressable 
          onPress={handleConfirm} 
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.ctaText}>
            {confirmed ? "✓ Inserted, continue..." : "I placed the sensor"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** ===== Main Component ===== */
export default function SensorPlacementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [done, setDone] = useState(false);
  
  // Get sensor ID from route params or use default
  const sensorId = route.params?.sensorId || 3;

  const handleConfirm = () => {
    setDone(true);
    // Navigate back to main screen after successful sensor placement
    setTimeout(() => {
      navigation.navigate('Main');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <Text style={styles.screenTitle}>Sensor Placement Guide</Text>
        <Stepper total={1} current={1} />

        {!done ? (
          <PlaceSensorFlow sensorId={sensorId} onConfirm={handleConfirm} />
        ) : (
          <View style={[styles.card, { alignItems: "center" }]}>
            <Text style={[styles.cardTitle, { marginBottom: 8 }]}>🎉 Sensor placed successfully!</Text>
            <Text style={[styles.instructions, { textAlign: "center" }]}>
              Your plant is now ready for monitoring.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
