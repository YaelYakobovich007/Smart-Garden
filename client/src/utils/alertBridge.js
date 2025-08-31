import { Alert } from 'react-native';

let isPatched = false;
let originalAlert = null;

export function registerAlertBridge(showAlert) {
  if (isPatched) return;
  if (!showAlert || typeof showAlert !== 'function') return;
  originalAlert = Alert.alert;
  Alert.alert = (title, message, buttons) => {
    try {
      let okText = 'OK';
      let onOk = null;
      let cancelText = null;
      let onCancel = null;
      if (Array.isArray(buttons) && buttons.length > 0) {
        // Try to map RN buttons to SmartAlert
        const cancelBtn = buttons.find(b => (b?.style === 'cancel')) || null;
        const okBtn = buttons.find(b => (b?.style !== 'cancel')) || buttons[buttons.length - 1] || null;
        if (cancelBtn) {
          cancelText = cancelBtn.text || 'Cancel';
          onCancel = cancelBtn.onPress || null;
        }
        if (okBtn) {
          okText = okBtn.text || 'OK';
          onOk = okBtn.onPress || null;
        }
      }
      showAlert({ title, message, okText, onOk, cancelText, onCancel });
    } catch (e) {
      // Fallback to original if anything goes wrong
      if (originalAlert) return originalAlert(title, message, buttons);
    }
  };
  isPatched = true;
}


