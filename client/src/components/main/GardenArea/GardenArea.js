import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from './styles';

const GardenArea = ({ garden, gardenLoading, onCreateOrJoinGarden }) => {
  return (
    <View style={styles.gardenAreaSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {garden ? 'Garden Area' : 'Garden'}
        </Text>
      </View>
      <View style={styles.titleSeparator} />

      {!gardenLoading && (
        <View style={styles.gardenStatusContainer}>
          {garden ? (
            <View style={styles.gardenCard}>
              <View style={styles.gardenCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.gardenCardIconContainer}>
                    <Feather name="users" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.gardenCardInfo}>
                    <Text style={styles.gardenCardTitle}>{garden.name}</Text>
                    {garden.city || garden.country ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Feather name="map-pin" size={14} color="#6B7280" />
                        <Text style={{ marginLeft: 6, fontSize: 12, color: '#6B7280' }}>
                          {[garden.city, garden.country].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.participantsTop}>
                  <Text style={styles.participantsText}>
                    {garden.member_count || 1} member{garden.member_count !== 1 ? 's' : ''}
                  </Text>
                  <View style={styles.participantDotsRow}>
                    {Array.from({ length: Math.min(garden.member_count || 1, 5) }, (_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.participantDot,
                          index < (garden.member_count || 1) ? styles.participantDotActive : styles.participantDotInactive
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.gardenCardFooter}>
                <View style={styles.gardenBadge}>
                  <Text style={styles.gardenBadgeText}>Active Garden</Text>
                </View>
                <View style={styles.gardenCardStat}>
                  <Feather name="clock" size={16} color="#16A34A" />
                  <Text style={styles.gardenCardStatText}>24/7 Monitoring</Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={onCreateOrJoinGarden} style={styles.gardenCardEmpty}>
              <View style={styles.gardenCardEmptyIcon}>
                <Feather name="users" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.gardenCardEmptyContent}>
                <Text style={styles.gardenCardEmptyTitle}>Connect to a Garden</Text>
                <Text style={styles.gardenCardEmptySubtitle}>
                  Join or create a garden to manage plants together
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#16A34A" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default GardenArea;


