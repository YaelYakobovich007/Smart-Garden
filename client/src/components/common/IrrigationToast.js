import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const TYPE_STYLES = {
  success: { bg: '#E8F5E9', border: '#A5D6A7', icon: '#4CAF50' },
  info: { bg: '#E3F2FD', border: '#90CAF9', icon: '#3B82F6' },
  error: { bg: '#FFEBEE', border: '#EF9A9A', icon: '#E53935' },
};

const IrrigationToast = ({
  visible,
  type = 'info',
  title = 'Smart Irrigation',
  message,
  onHide,
  autoHideMs = 2800,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef(null);

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();

      // Auto-hide
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        handleHide();
      }, autoHideMs);
    } else {
      // Reset positioning for next show
      opacity.setValue(0);
      translateY.setValue(20);
    }

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [visible]);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  const palette = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.container, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <View style={styles.iconWrap}>
          <Feather name="droplet" size={22} color={palette.icon} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
        </View>
        <TouchableOpacity onPress={handleHide} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={18} color="#607D8B" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    maxWidth: '92%',
  },
  iconWrap: {
    marginRight: 10,
  },
  textWrap: {
    flexShrink: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#37474F',
  },
  closeBtn: {
    marginLeft: 10,
  },
});

export default IrrigationToast;


