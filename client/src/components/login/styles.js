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
    },
    connectionStatus: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'center',
        marginBottom: 16,
    },
    connectionStatusText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
        fontFamily: 'Nunito_700Bold',
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
    forgotPassword: {
        color: '#2E8B57',
        textAlign: 'right',
        marginBottom: 16,
        fontWeight: '600',
        fontFamily: 'Nunito_500Medium',
    },
    signInButton: {
        backgroundColor: '#34A853',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
        opacity: 0.6,
    },
    signInButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Nunito_700Bold',
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    separatorText: {
        marginHorizontal: 10,
        color: '#888',
        fontFamily: 'Nunito_400Regular',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderColor: '#E0E0E0',
        borderWidth: 1,
        paddingVertical: 15,
        borderRadius: 10,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    googleButtonText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 16,
        fontFamily: 'Nunito_500Medium',
    },
    message: {
        marginTop: 16,
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'Nunito_700Bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        color: '#666',
        fontFamily: 'Nunito_400Regular',
    },
    signUpText: {
        color: '#34A853',
        fontWeight: 'bold',
        fontFamily: 'Nunito_700Bold',
    },
}); 