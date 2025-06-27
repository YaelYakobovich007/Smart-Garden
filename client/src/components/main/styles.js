import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  appTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  appLogo: {
    width: 24,
    height: 28,
    marginRight: 8,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#95A5A6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    padding: 4,
  },
  notificationsButton: {
    padding: 4,
    marginRight: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  simulationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  simulationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  logoutButton: {
    padding: 4,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  connectionWarningText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  plantsSection: {
    flex: 0.6,
    marginTop: 8,
    marginBottom: 16,
  },
  notificationsSection: {
    flex: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
}); 