/**
 * HelpTooltip - Inline contextual help trigger
 *
 * Renders a small icon button that opens a themed popup with
 * title and description to guide users through form fields.
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import StatusPopup from '../ui/StatusPopup';

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

            <StatusPopup
                visible={showTooltip}
                type="success"
                title={title}
                description={description}
                buttonText="Got it"
                onButtonPress={() => setShowTooltip(false)}
                onClose={() => setShowTooltip(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    helpButton: {
        marginLeft: 8,
        padding: 4,
    },
});

export default HelpTooltip;
