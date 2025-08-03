import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Nunito_700Bold',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
    width: '100%',
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: 20,
  },
  articleHeader: {
    marginBottom: 24,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    lineHeight: 32,
    marginBottom: 12,
    fontFamily: 'Nunito_700Bold',
  },
  articleDescription: {
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: 'Nunito_400Regular',
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  readTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readTimeText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontFamily: 'Nunito_400Regular',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryMetaText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    fontFamily: 'Nunito_600SemiBold',
  },
  articleBody: {
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    marginTop: 8,
    fontFamily: 'Nunito_700Bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    marginTop: 20,
    fontFamily: 'Nunito_600SemiBold',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
  paragraph: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 12,
    fontFamily: 'Nunito_400Regular',
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
  },
  bulletText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    flex: 1,
    fontFamily: 'Nunito_400Regular',
  },
  paragraphSpacing: {
    height: 16,
  },
});

export default styles; 