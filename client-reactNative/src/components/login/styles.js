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
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
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
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingHorizontal: 15,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize: 16,
    },
    forgotPassword: {
        color: '#2E8B57',
        textAlign: 'right',
        marginBottom: 16,
        fontWeight: '600',
    },
    signInButton: {
        backgroundColor: '#34A853',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    signInButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
    },
    message: {
        marginTop: 16,
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        color: '#666',
    },
    signUpText: {
        color: '#34A853',
        fontWeight: 'bold',
    },
}); 