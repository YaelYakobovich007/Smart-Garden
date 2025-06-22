import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from './styles';

const NotificationArea = ({ notifications, isSimulationMode }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'watering':
        return <Feather name="droplets" size={16} color="#3B82F6" />;
      case 'alert':
        return <Feather name="alert-triangle" size={16} color="#EF4444" />;
      case 'reminder':
        return <Feather name="clock" size={16} color="#F59E0B" />;
      case 'success':
        return <Feather name="check-circle" size={16} color="#10B981" />;
      default:
        return <Feather name="bell" size={16} color="#6B7280" />;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'alert':
        return { backgroundColor: '#FEF2F2', borderLeftColor: '#F87171' };
      case 'reminder':
        return { backgroundColor: '#FFFBEB', borderLeftColor: '#FBBF24' };
      case 'success':
        return { backgroundColor: '#ECFDF5', borderLeftColor: '#34D399' };
      case 'watering':
        return { backgroundColor: '#EFF6FF', borderLeftColor: '#60A5FA' };
      default:
        return { backgroundColor: '#F9FAFB', borderLeftColor: '#D1D5DB' };
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="bell" size={32} color="#9CA3AF" />
        <Text style={styles.emptyStateText}>No notifications yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Feather name="bell" size={20} color="#374151" />
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Notifications List */}
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {notifications.slice(0, 5).map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              getNotificationStyle(notification.type),
              { marginRight: 12, minWidth: 300 }
            ]}
            onPress={() => {
              // TODO: Handle notification press
              console.log('Notification pressed:', notification.message);
            }}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </View>
              
              <View style={styles.notificationText}>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.timestamp)}
                </Text>
              </View>
              
              <View style={styles.notificationActions}>
                {!notification.isRead && (
                  <TouchableOpacity style={styles.actionButton}>
                    <Feather name="check-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton}>
                  <Feather name="x" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default NotificationArea; 