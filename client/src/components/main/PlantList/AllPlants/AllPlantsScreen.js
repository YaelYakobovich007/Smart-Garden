/**
 * All Plants Screen - Flat list of all user plants
 *
 * Fetches/normalizes plant data from backend and allows navigation
 * to detailed plant view.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import websocketService from '../../../../services/websocketService';
import styles from './styles';

const AllPlantsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [plants, setPlants] = useState(route.params?.plants || []);

  useEffect(() => {
    if (plants.length === 0 && websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
    const handlePlantsReceived = (data) => {
      if (data.plants) {
        const normalized = data.plants.map(p => ({
          id: Number(p.plant_id ?? p.id),
          name: p.name,
          type: p.plant_type || 'Unknown',
          image_url: p.image_url,
          moisture: p.moisture ?? null,
          temperature: p.temperature ?? null,
        }));
        setPlants(normalized);
      }
    };
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    return () => {
      websocketService.offMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    };
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PlantDetail', { plant: item })}>
      <View style={styles.thumbWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Feather name="image" size={18} color="#9CA3AF" />
          </View>
        )}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSubtitle}>{item.type}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Plants</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={plants}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Feather name="leaf" size={28} color="#16A34A" />
            <Text style={styles.emptyTitle}>No plants yet</Text>
            <Text style={styles.emptySubtitle}>Add your first plant to get started</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddPlant')}>
              <Text style={styles.addButtonText}>Add Plant</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default AllPlantsScreen;


