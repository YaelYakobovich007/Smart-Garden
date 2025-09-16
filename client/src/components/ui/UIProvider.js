/**
 * UI Provider - Global Alert/Status Popup Context
 *
 * Exposes `showAlert`/`hideAlert` for unified, themed status dialogs
 * across the app. Bridges native `Alert.alert` calls to custom UI.
 */
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { registerAlertBridge } from '../../utils/alertBridge';
import StatusPopup from './StatusPopup';

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
    iconName: null,
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
      iconName: opts?.iconName || null,
    });
  }, []);

  const value = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  // Bridge RN Alert.alert -> SmartAlert once, after provider mounts
  useEffect(() => {
    try { registerAlertBridge(showAlert); } catch { }
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

  // Determine popup type based on variant or content
  const getPopupType = () => {
    if (alertState.variant === 'error' || alertState.variant === 'warning') {
      return 'error';
    }
    if (alertState.variant === 'success') {
      return 'success';
    }
    // Respect explicit 'info' to force neutral gray button
    if (alertState.variant === 'info') {
      return 'info';
    }
    // Default to neutral (purple person icon) for info messages
    const message = alertState.message.toLowerCase();
    if (message.includes('failed') || message.includes('error') || message.includes('wrong')) {
      return 'error';
    }
    if (message.includes('success') || message.includes('completed') || message.includes('saved')) {
      return 'success';
    }
    return 'info'; // This will show the purple person icon like in the image
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <StatusPopup
        visible={alertState.visible}
        type={getPopupType()}
        title={alertState.title}
        description={alertState.message}
        buttonText={alertState.okText}
        onButtonPress={handleOk}
        onClose={alertState.dismissible ? hideAlert : undefined}
        cancelText={alertState.cancelText}
        onCancel={alertState.cancelText ? handleCancel : undefined}
        iconName={alertState.iconName}
      />
    </UIContext.Provider>
  );
};


