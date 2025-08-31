import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Nunito_700Bold'
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  manualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 14,
    fontFamily: 'Nunito_700Bold'
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  manualRowChecked: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7'
  },
  manualItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Nunito_700Bold'
  },
  manualItemText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
    fontFamily: 'Nunito_400Regular'
  },
  manualDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12
  },
  manualBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED'
  },
  manualBadgeChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B'
  },
  manualBadgeText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 16
  },
  plantInfo: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF'
  },
  bannerAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB'
  },
  bannerBlue: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB'
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    fontFamily: 'Nunito_700Bold'
  },
  bannerText: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'Nunito_400Regular'
  },
  bannerBullet: {
    fontSize: 14,
    color: '#1E3A8A',
    fontFamily: 'Nunito_400Regular'
  },
  plantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  plantStatus: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  stepsContainer: {
    gap: 16,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  activeStep: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completedStep: {
    backgroundColor: '#10B981',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepTitleContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activeStepTitle: {
    color: '#3B82F6',
  },
  stepDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },
  checksContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  completeStepButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  completeStepButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  unblockSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unblockHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  unblockTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  unblockDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  unblockButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  unblockButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
