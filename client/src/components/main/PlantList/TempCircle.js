import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

const SIZE = 48;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TempCircle = ({ value }) => {
  // Clamp value to a reasonable range for the ring (e.g., 0-40°C)
  const min = 0;
  const max = 40;
  const progress = Math.max(min, Math.min(value, max));
  const percent = ((progress - min) / (max - min)) * 100;
  const strokeDashoffset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#E5E7EB"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#7CB518"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="thermometer" size={20} color="#7CB518" />
      </View>
      <Text style={{ fontSize: 12, color: '#222', marginTop: 2, fontWeight: '500' }}>{value}°C</Text>
    </View>
  );
};

export default TempCircle; 