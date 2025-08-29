import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  horizontalScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  plantImageContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  // Add a spacer under image to increase gap before name
  plantImageSpacer: {
    height: 12,
  },
  plantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  wateringIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  wateringDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  wateringGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 15,
    backgroundColor: '#3B82F6',
    opacity: 0.6,
    zIndex: -1,
  },
  rippleCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#3B82F6',
    zIndex: -1,
  },
  smartWateringDot: {
    backgroundColor: '#8B5CF6', // Purple for smart irrigation
    shadowColor: '#8B5CF6',
  },
  manualWateringDot: {
    backgroundColor: '#3B82F6', // Blue for manual irrigation
    shadowColor: '#3B82F6',
  },
  smartRippleCircle: {
    backgroundColor: '#8B5CF6', // Purple for smart irrigation
    borderColor: '#8B5CF6',
  },
  plantContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 0,
  },
  plantHeader: {
    marginBottom: 16,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  plantType: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: -8,
  },
  valveBlockedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  valveBlockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  plantStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 80,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingBottom: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    marginBottom: 20,
    marginTop: -20, // Move image higher up
  },
  emptyStateText: {
    fontSize: 18,
    color: '#BDC3C7',
    marginTop: 0, // Reduced top margin since image is higher
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    marginBottom: 24, // Add more space before button
    paddingHorizontal: 20, // Add horizontal padding for better text wrapping
  },
  addFirstPlantButton: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addFirstPlantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  plantsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  // moisture button styles removed
}); 