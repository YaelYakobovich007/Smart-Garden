/**
 * Notification Screen - Irrigation Events and Alerts
 *
 * Fetches recent irrigation results per plant and presents them
 * as readable notifications with status, time, and details.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import websocketService from '../../services/websocketService';
import { Feather } from '@expo/vector-icons';
import { styles } from './styles';

const STATUS_COLORS = {
  error: '#EF4444', // red
  skipped: '#F59E42', // yellow
  done: '#22C55E', // green
  success: '#22C55E', // green
};
const STATUS_SOFT_BG = {
  error: '#FEE2E2',
  skipped: '#FEF3C7',
  done: '#ECFDF5',
  success: '#ECFDF5',
};
const UNREAD_DOT_COLOR = '#3B82F6'; // blue

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ sent: 0, received: 0, total: 0 });
  const spinValue = useRef(new Animated.Value(0)).current;

  // Spinning animation for loading
  useEffect(() => {
    if (loading) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }
  }, [loading, spinValue]);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setNotifications([]);
    setLoading(true);

    // Single handler for all irrigation results - defined outside handlePlants
    const handleIrrigation = (irrigationData) => {
      if (!isMounted) return;
      const plantName = irrigationData.plantName;

      // Update progress
      setLoadingProgress(prev => {
        const newProgress = { ...prev, received: prev.received + 1 };

        // Check if all responses received
        if (newProgress.received >= newProgress.total) {
          setTimeout(() => {
            if (isMounted) {
              setLoading(false);
            }
          }, 500);
        }

        return newProgress;
      });

      if (irrigationData.results && Array.isArray(irrigationData.results)) {
        irrigationData.results.forEach((result) => {
          setNotifications(prev => [...prev, {
            plantName: plantName,
            status: result.status,
            time: result.irrigation_time || result.event_timestamp || result.time || result.timestamp || '',
            message: result.reason || result.message || '',
            amount: result.water_added_liters || result.amount || result.waterAmount || null,
            finalMoisture: result.final_moisture || result.finalMoisture || result.moisture || null,
            read: false, // All notifications start as unread
          }]);
        });
      } else {
        // No results
      }
    };

    // Step 1: Get user's plants
    const handlePlants = (data) => {
      if (!isMounted) return;
      if (!data.plants || !Array.isArray(data.plants)) {
        setError('No plants found');
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Step 2: For each plant, get irrigation results
      let pending = data.plants.length;

      if (pending === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Set progress info
      setLoadingProgress({ sent: pending, received: 0, total: pending });

      // Register the handler once
      websocketService.onMessage('GET_IRRIGATION_RESULT_SUCCESS', handleIrrigation);

      // Send requests for all plants
      data.plants.forEach((plant) => {
        websocketService.sendMessage({ type: 'GET_IRRIGATION_RESULT', plantName: plant.name });
      });

      // Set a timeout to stop loading if no responses come
      setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 10000); // 10 seconds timeout
    };

    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlants);
    websocketService.sendMessage({ type: 'GET_MY_PLANTS' });

    return () => {
      isMounted = false;
      // Clean up message handlers
      websocketService.offMessage('GET_MY_PLANTS_RESPONSE', handlePlants);
      websocketService.offMessage('GET_IRRIGATION_RESULT_SUCCESS', handleIrrigation);
    };
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'done' || status === 'success')
      return <Feather name="check-circle" size={18} color={STATUS_COLORS.done} style={{ marginRight: 6 }} />;
    if (status === 'skipped')
      return <Feather name="alert-triangle" size={18} color={STATUS_COLORS.skipped} style={{ marginRight: 6 }} />;
    if (status === 'error')
      return <Feather name="x-circle" size={18} color={STATUS_COLORS.error} style={{ marginRight: 6 }} />;
    return <Feather name="info" size={18} color="#6B7280" style={{ marginRight: 6 }} />;
  };

  const handleMarkAsRead = (idx) => {
    setNotifications((prev) => prev.map((n, i) => i === idx ? { ...n, read: true } : n));
  };

  // Helper to format date/time
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Loading state with proper loading screen
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Irrigation Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingSpinner,
                {
                  transform: [{
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}
            >
              <Feather name="loader" size={48} color="#4CAF50" />
            </Animated.View>
            <Text style={styles.loadingTitle}>Loading Notifications...</Text>
            <Text style={styles.loadingMessage}>
              Fetching irrigation history for your plants
            </Text>
            {loadingProgress.total > 0 && (
              <Text style={styles.loadingProgress}>
                {loadingProgress.received} of {loadingProgress.total} plants processed
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (notifications.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Irrigation Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Feather name="bell" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyMessage}>You don't have any irrigation notifications at the moment</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Irrigation Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {notifications.map((notif, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.notificationRow,
                { borderLeftColor: STATUS_COLORS[notif.status] || '#16A34A' },
              ]}
              activeOpacity={0.7}
              onPress={() => handleMarkAsRead(idx)}
            >
              <View style={[styles.statusIconWrap, { backgroundColor: STATUS_SOFT_BG[notif.status] || '#ECFDF5' }]}>
                {getStatusIcon(notif.status)}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={[styles.plantName, !notif.read && styles.unreadText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {notif.plantName}
                    </Text>
                    {!notif.read && <View style={styles.unreadDotSmall} />}
                  </View>
                  <View style={[styles.statusPillFilled, { backgroundColor: (STATUS_COLORS[notif.status] || '#16A34A') }]}>
                    <Text style={styles.statusPillTextInverse}>
                      {(notif.status || 'info').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusText}>{notif.time ? formatDateTime(notif.time) : ''}</Text>
                {notif.amount !== null && (
                  <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">Watered: {notif.amount} L</Text>
                )}
                {notif.finalMoisture !== null && (
                  <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">Final Moisture: {notif.finalMoisture}%</Text>
                )}
                {notif.message ? <Text style={styles.message} numberOfLines={2} ellipsizeMode="tail">{notif.message}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default NotificationScreen;