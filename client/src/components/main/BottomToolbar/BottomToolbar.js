import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from './styles';

const BottomToolbar = ({ onAddPlant, onSchedule, onSettings, onHelp }) => {
  const toolbarItems = [
    {
      id: 'add',
      icon: 'plus',
      label: 'Add Plant',
      onPress: onAddPlant,
    },
    {
      id: 'schedule',
      icon: 'calendar',
      label: 'Schedule',
      onPress: onSchedule,
    },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Settings',
      onPress: onSettings,
    },
    {
      id: 'help',
      icon: 'help-circle',
      label: 'Help',
      onPress: onHelp,
    },
  ];

  return (
    <View style={styles.toolbar}>
      {toolbarItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.toolbarItem}
          onPress={item.onPress}
        >
          <View style={styles.iconContainer}>
            <Feather name={item.icon} size={20} color="#1c7823" />
          </View>
          <Text style={styles.toolbarLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default BottomToolbar;