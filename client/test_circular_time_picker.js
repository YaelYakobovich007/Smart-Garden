// Test file for CircularTimePicker component
// This file can be used to test the component in isolation

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CircularTimePicker from './src/components/main/PlantDetail/CircularTimePicker';

const TestApp = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState(10);

  const handleTimeSelected = (time) => {
    console.log('Selected time:', time);
    setSelectedTime(time);
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circular Time Picker Test</Text>
      <Text style={styles.subtitle}>Selected time: {selectedTime} minutes</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.buttonText}>Open Time Picker</Text>
      </TouchableOpacity>

      <CircularTimePicker
        visible={isVisible}
        onClose={() => setIsVisible(false)}
        onTimeSelected={handleTimeSelected}
        initialTime={selectedTime}
        timeOptions={[5, 10, 15, 20, 30, 45, 60]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TestApp; 