import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const HelpTooltip = ({ title, description, style }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <>
            <TouchableOpacity
                style={[styles.helpButton, style]}
                onPress={() => setShowTooltip(true)}
            >
                <Feather name="help-circle" size={16} color="#4CAF50" />
            </TouchableOpacity>

            <Modal
                visible={showTooltip}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTooltip(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowTooltip(false)}
                >
                    <View style={styles.tooltipContainer}>
                        <View style={styles.tooltipHeader}>
                            <Text style={styles.tooltipTitle}>{title}</Text>
                            <TouchableOpacity
                                onPress={() => setShowTooltip(false)}
                                style={styles.closeButton}
                            >
                                <Feather name="x" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.tooltipDescription}>{description}</Text>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    helpButton: {
        marginLeft: 8,
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    tooltipContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        maxWidth: 300,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    tooltipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tooltipTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    tooltipDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
});

export default HelpTooltip;
