import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8', // Light background color
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 30,
        position: 'relative',
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 0,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#34A853',
        fontFamily: 'Nunito_700Bold',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
        fontFamily: 'Nunito_400Regular',
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 20,
        zIndex: 1,
        padding: 8,
    },
    formContainer: {
        marginHorizontal: 24,
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    welcomeTitle: {
        fontSize: 23,
        fontWeight: 'bold',
        color: '#34A853',
        textAlign: 'center',
        fontFamily: 'Nunito_700Bold',
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Nunito_400Regular',
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingHorizontal: 15,
        marginBottom: 8,
    },
    inputError: {
        borderColor: '#D32F2F',
        borderWidth: 2,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize: 16,
        fontFamily: 'Nunito_400Regular',
    },
    fieldError: {
        color: '#D32F2F',
        fontSize: 12,
        marginBottom: 8,
        marginLeft: 5,
    },
    signInButton: {
        backgroundColor: '#34A853',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 16,
    },
    disabledButton: {
        backgroundColor: '#BDBDBD',
    },
    signInButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Nunito_700Bold',
    },
    message: {
        textAlign: 'center',
        marginTop: 16,
        paddingHorizontal: 16,
        fontSize: 14,
        fontFamily: 'Nunito_400Regular',
    },
    backToLoginButton: {
        marginTop: 20,
        paddingVertical: 10,
    },
    backToLoginText: {
        color: '#34A853',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'Nunito_600SemiBold',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        color: '#666',
        fontSize: 16,
        fontFamily: 'Nunito_400Regular',
    },
}); 