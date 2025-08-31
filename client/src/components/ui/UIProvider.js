import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { registerAlertBridge } from '../../utils/alertBridge';

const UIContext = createContext(null);

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
};

export const UIProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    okText: 'OK',
    onOk: null,
    cancelText: null,
    onCancel: null,
    dismissible: true,
    variant: 'info',
  });

  const hideAlert = useCallback(() => {
    setAlertState((s) => ({ ...s, visible: false }));
  }, []);

  const showAlert = useCallback((opts) => {
    setAlertState({
      visible: true,
      title: opts?.title || '',
      message: opts?.message || '',
      okText: opts?.okText || 'OK',
      onOk: typeof opts?.onOk === 'function' ? opts.onOk : null,
      cancelText: opts?.cancelText || null,
      onCancel: typeof opts?.onCancel === 'function' ? opts.onCancel : null,
      dismissible: opts?.dismissible !== false,
      variant: opts?.variant || 'info',
    });
  }, []);

  const value = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  // Bridge RN Alert.alert -> SmartAlert once, after provider mounts
  useEffect(() => {
    try { registerAlertBridge(showAlert); } catch {}
  }, [showAlert]);

  const handleOk = () => {
    const cb = alertState.onOk;
    hideAlert();
    if (cb) setTimeout(cb, 0);
  };

  const handleCancel = () => {
    const cb = alertState.onCancel;
    hideAlert();
    if (cb) setTimeout(cb, 0);
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={alertState.visible}
        onRequestClose={() => (alertState.dismissible ? hideAlert() : null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 0, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            {/* Top accent bar */}
            <View style={{ height: 4, backgroundColor: '#16A34A', marginHorizontal: -20, marginTop: -20, marginBottom: 12 }} />
            {!!alertState.title && (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#2C3E50', marginBottom: 8, textAlign: 'center', fontFamily: 'Nunito_700Bold' }}>
                {alertState.title}
              </Text>
            )}
            <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 16, lineHeight: 22, textAlign: 'left', fontFamily: 'Nunito_400Regular' }}>
              {alertState.message}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              {alertState.cancelText ? (
                <TouchableOpacity onPress={handleCancel} style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 }}>
                  <Text style={{ color: '#6B7280', fontWeight: '600', fontFamily: 'Nunito_600SemiBold' }}>{alertState.cancelText}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleOk} style={{ backgroundColor: '#16A34A', borderRadius: 0, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontFamily: 'Nunito_600SemiBold' }}>{alertState.okText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </UIContext.Provider>
  );
};


