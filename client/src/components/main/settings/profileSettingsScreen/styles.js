import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Nunito_700Bold',
    },
    headerSpacer: {
        width: 34,
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        fontFamily: 'Nunito_600SemiBold',
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
});


