import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import websocketService from '../../services/websocketService';
import { Feather } from '@expo/vector-icons';
import { styles } from './styles';

const STATUS_COLORS = {
  error: '#EF4444', // red
  skipped: '#F59E42', // yellow
  done: '#22C55E', // green
  success: '#22C55E', // green (למקרה שיש status כזה)
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
      console.log('🔔 NotificationScreen: Received irrigation data:', irrigationData);
      if (!isMounted) return;
      const plantName = irrigationData.plantName;

      // Update progress
      setLoadingProgress(prev => {
        const newProgress = { ...prev, received: prev.received + 1 };

        // Check if all responses received
        if (newProgress.received >= newProgress.total) {
          console.log('🔔 NotificationScreen: All responses received, stopping loading');
          setTimeout(() => {
            if (isMounted) {
              setLoading(false);
            }
          }, 500); // Small delay to show completion
        }

        return newProgress;
      });

      if (irrigationData.results && Array.isArray(irrigationData.results)) {
        console.log(`🔔 NotificationScreen: Found ${irrigationData.results.length} irrigation results for ${plantName}`);
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
        console.log('🔔 NotificationScreen: No results array in irrigation data');
      }
    };

    // Step 1: Get user's plants
    const handlePlants = (data) => {
      console.log('🔔 NotificationScreen: Received plants data:', data);
      if (!isMounted) return;
      if (!data.plants || !Array.isArray(data.plants)) {
        console.log('🔔 NotificationScreen: No plants found in data');
        setError('No plants found');
        setNotifications([]);
        setLoading(false);
        return;
      }
      console.log(`🔔 NotificationScreen: Found ${data.plants.length} plants`);

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
          console.log('🔔 NotificationScreen: Timeout reached, stopping loading');
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
      return <Feather name="check-circle" size={22} color={STATUS_COLORS.done} style={{ marginRight: 8 }} />;
    if (status === 'skipped')
      return <Feather name="alert-triangle" size={22} color={STATUS_COLORS.skipped} style={{ marginRight: 8 }} />;
    if (status === 'error')
      return <Feather name="x-circle" size={22} color={STATUS_COLORS.error} style={{ marginRight: 8 }} />;
    return <Feather name="info" size={22} color="#6B7280" style={{ marginRight: 8 }} />;
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
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Irrigation Notifications</Text>
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
    );
  }

  // Empty state - removed, screen will be blank if no notifications
  if (notifications.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Irrigation Notifications</Text>
        <View style={styles.emptyContainer}>
          <Feather name="bell" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyMessage}>You don't have any irrigation notifications at the moment</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="chevron-left" size={24} color="#2C3E50" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Irrigation Notifications</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }}>
        {notifications.map((notif, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.notificationRow,
              {
                backgroundColor:
                  notif.status === 'error'
                    ? '#FEE2E2'
                    : notif.status === 'skipped'
                      ? '#FEF3C7'
                      : notif.status === 'done' || notif.status === 'success'
                        ? '#DCFCE7'
                        : '#fff',
                borderLeftWidth: 6,
                borderLeftColor: STATUS_COLORS[notif.status] || '#16A34A',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => handleMarkAsRead(idx)}
          >
            {getStatusIcon(notif.status)}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.plantName,
                    { color: STATUS_COLORS[notif.status] || '#16A34A' },
                    !notif.read && styles.unreadText,
                  ]}
                >
                  {notif.plantName}
                </Text>
              </View>
              <Text style={styles.statusText}>
                {notif.status ? notif.status.toUpperCase() : ''} {notif.time ? `- ${formatDateTime(notif.time)}` : ''}
              </Text>
              {notif.amount !== null && (
                <Text style={styles.infoText}>Watered: {notif.amount} L</Text>
              )}
              {notif.finalMoisture !== null && (
                <Text style={styles.infoText}>Final Moisture: {notif.finalMoisture}%</Text>
              )}
              {notif.message ? <Text style={styles.message}>{notif.message}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default NotificationScreen;