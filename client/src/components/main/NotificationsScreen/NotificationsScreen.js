import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles';

const NotificationsScreen = ({ notifications = [], isSimulationMode = false }) => {
  const navigation = useNavigation();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'watering':
        return <Feather name="droplets" size={20} color="#3B82F6" />;
      case 'alert':
        return <Feather name="alert-triangle" size={20} color="#EF4444" />;
      case 'reminder':
        return <Feather name="clock" size={20} color="#F59E0B" />;
      case 'success':
        return <Feather name="check-circle" size={20} color="#10B981" />;
      default:
        return <Feather name="bell" size={20} color="#6B7280" />;
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

  const renderNotification = ({ item }) => (
    <View style={[styles.notificationCard, getNotificationStyle(item.type)]}>
      <View style={styles.notificationContent}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(item.type)}
        </View>
        
        <View style={styles.notificationText}>
          <Text style={styles.notificationMessage}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
        
        <View style={styles.notificationActions}>
          {!item.isRead && (
            <TouchableOpacity style={styles.actionButton}>
              <Feather name="check-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="x" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Notifications List */}
      <View style={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell" size={48} color="#BDC3C7" />
            <Text style={styles.emptyStateText}>No notifications yet</Text>
            <Text style={styles.emptyStateSubtext}>
              You'll see important updates about your plants here
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsList}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen; 