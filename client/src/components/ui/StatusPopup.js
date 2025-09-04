import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Leaf } from 'lucide-react-native';

const StatusPopup = ({ 
  visible, 
  type, // 'success', 'error', or 'info'
  title, 
  description, 
  buttonText, 
  onButtonPress, 
  onClose,
  cancelText,
  onCancel,
  iconName,
}) => {
  const hasCancelButton = cancelText && onCancel;
  
  const getIconName = () => {
    if (iconName) return iconName;
    if (type === 'error') return 'x-circle';
    if (type === 'success') return 'check';
    return 'user'; // Default person icon like in the User Profile dialog
  };
  
  const getIconColor = () => {
    if (iconName === 'droplet') return '#2563EB';
    if (type === 'error') return '#EF4444';
    if (type === 'success') return '#2E7D32';
    return '#8B5CF6'; // Purple like in the User Profile dialog
  };

  const getIconBackgroundColor = () => {
    if (iconName === 'droplet') return '#EFF6FF';
    if (type === 'error') return '#FEF2F2';
    if (type === 'success') return '#F0FDF4';
    return '#F8FAFC'; // Light blue-gray like in the User Profile dialog
  };

  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isInfo = !isSuccess && !isError;

  const primaryButtonBackground = isSuccess
    ? '#4CAF50'
    : isError
      ? '#EF4444'
      : '#F3F4F6';

  const primaryButtonTextColor = isSuccess || isError ? '#FFFFFF' : '#374151';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon and Title Section */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { 
              backgroundColor: getIconBackgroundColor(),
              borderColor: getIconColor() 
            }]}>
              {iconName === 'leaf' ? (
                <Leaf size={20} color={getIconColor()} />
              ) : (
                <Feather name={getIconName()} size={20} color={getIconColor()} />
              )}
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          
          {/* Description */}
          <Text style={styles.description}>{description}</Text>
          
          {/* Action Buttons */}
          <View style={[styles.buttonContainer, hasCancelButton && styles.dualButtonContainer]}>
            {hasCancelButton && (
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton, { flex: 1 }]} 
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: primaryButtonBackground, alignSelf: 'center' },
                !hasCancelButton && { minWidth: 140 },
                hasCancelButton && { flex: 1 }
              ]}
              onPress={onButtonPress || onClose}
            >
              <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor, fontWeight: isInfo ? '500' : '600' }]}>
                {buttonText || 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 500, // sm:max-w-[500px]
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24, // mb-6
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#1F2937', // text-gray-900
    fontFamily: 'Nunito_600SemiBold',
    flex: 1,
  },
  description: {
    fontSize: 14, // text-sm
    fontWeight: '600', // match title weight
    color: '#6B7280', // text-muted-foreground
    fontFamily: 'Nunito_600SemiBold', // match title family
    lineHeight: 20,
    marginBottom: 24, // mb-6
  },
  buttonContainer: {
    alignItems: 'center',
  },
  dualButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12, // gap-3
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6, // rounded-md
    paddingVertical: 10, // py-2.5
    paddingHorizontal: 16, // px-4
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#F3F4F6', // default for info; success/error override inline
  },
  cancelButton: {
    backgroundColor: '#FFFFFF', // outline
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
  },
  primaryButtonText: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#374151', // text-gray-700
    fontFamily: 'Nunito_500Medium',
  },
  cancelButtonText: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#374151', // text-gray-700
    fontFamily: 'Nunito_500Medium',
  },
});

export default StatusPopup;
