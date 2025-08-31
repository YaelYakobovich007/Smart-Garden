import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  gardenAreaSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Nunito_500Medium',
  },
  titleSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  gardenStatusContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  gardenCard: {
    backgroundColor: '#F8FFFE',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  gardenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gardenCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#16A34A',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  gardenCardInfo: {
    flex: 1,
  },
  gardenCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: 'Nunito_700Bold',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Nunito_500Medium',
  },
  participantDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  participantDotActive: {
    backgroundColor: '#16A34A',
  },
  participantDotInactive: {
    backgroundColor: '#16A34A',
  },
  gardenCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  gardenCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gardenCardStatText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Nunito_500Medium',
  },
  gardenCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFFE',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  gardenCardEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#16A34A',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  gardenCardEmptyContent: {
    flex: 1,
  },
  gardenCardEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: 'Nunito_700Bold',
  },
  gardenCardEmptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Nunito_400Regular',
  },
});

export default styles;


