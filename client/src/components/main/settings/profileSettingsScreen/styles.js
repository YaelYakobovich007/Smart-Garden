import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EAF5E4',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2C3E50',
        fontFamily: 'Nunito_700Bold',
    },
    headerSpacer: {
        width: 34,
    },
    content: {
        padding: 16,
    },
    // Unified panel container
    panelContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    // Hero
    heroCard: {
        backgroundColor: '#EAF6EF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#D9F0E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    heroTextWrap: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3E50',
    },
    heroSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: '#4B5563',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        fontFamily: 'Nunito_600SemiBold',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 10,
    },
    // Unified section spacing and divider
    sectionUnified: {
        paddingVertical: 12,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    lastSection: {
        borderBottomWidth: 0,
        marginBottom: 0,
        paddingBottom: 0,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingHorizontal: 15,
        marginBottom: 10,
        minHeight: 48,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        color: '#333',
        fontSize: 16,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    buttonPrimary: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontFamily: 'Nunito_600SemiBold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    linkButton: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    linkText: {
        color: '#2563EB',
        fontWeight: '600',
    },
    buttonIconLeft: {
        marginRight: 6,
    },
    hintText: {
        marginTop: 10,
        fontSize: 12,
        color: '#6C757D',
        fontFamily: 'Nunito_400Regular',
    },
    // Pickers
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingHorizontal: 15,
        marginBottom: 8,
        minHeight: 50,
    },
    pickerWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerDisplayText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    pickerPlaceholder: {
        color: '#888',
    },
    pickerIcon: {
        marginLeft: 8,
    },
    inlinePicker: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 6,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 8,
    },
});


