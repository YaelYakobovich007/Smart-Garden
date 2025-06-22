import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  horizontalScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    width: 280,
    minHeight: 340,
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
    overflow: 'hidden',
  },
  plantImageContainer: {
    width: '100%',
    height: 160,
  },
  plantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  plantContent: {
    padding: 16,
  },
  plantHeader: {
    marginBottom: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  plantType: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  plantStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#BDC3C7',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
  },
}); 