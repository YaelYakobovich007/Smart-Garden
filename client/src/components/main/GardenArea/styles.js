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
    backgroundColor: '#F0F8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gardenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  gardenCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#1B5E20',
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
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    width: '100%',
  },
  participantsTop: {
    alignItems: 'flex-end',
  },
  participantsText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Nunito_500Medium',
    textAlign: 'right',
  },
  participantDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  participantDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    paddingTop: 12,
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
  gardenBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  gardenBadgeText: {
    fontSize: 12,
    color: '#1B5E20',
    fontFamily: 'Nunito_700Bold',
  },
  gardenCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gardenCardEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#1B5E20',
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


