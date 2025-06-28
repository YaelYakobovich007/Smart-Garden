import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setNotifications([]);
    setLoading(true);

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
      const allNotifications = [];
      if (pending === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      data.plants.forEach((plant) => {
        const handleIrrigation = (irrigationData) => {
          const plantName = irrigationData.plantName;
          if (!isMounted) return;
          if (irrigationData.results && Array.isArray(irrigationData.results)) {
            irrigationData.results.forEach((result) => {
              allNotifications.push({
                plantName: plantName,
                status: result.status,
                time: result.irrigation_time || result.event_timestamp || result.time || result.timestamp || '',
                message: result.reason || result.message || '',
                amount: result.water_added_liters || result.amount || result.waterAmount || null,
                finalMoisture: result.final_moisture || result.finalMoisture || result.moisture || null,
                read: false, // All notifications start as unread
              });
            });
          }
          pending--;
          if (pending === 0) {
            // Sort notifications by time descending (if available)
            allNotifications.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
            setNotifications(allNotifications);
            setLoading(false);
          }
        };
        websocketService.onMessage('GET_IRRIGATION_RESULT_SUCCESS', handleIrrigation);
        websocketService.sendMessage({ type: 'GET_IRRIGATION_RESULT', plantName: plant.name });
      });
    };
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlants);
    websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    return () => { isMounted = false; };
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

  // Loading state - removed, screen will be blank during loading
  if (loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
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