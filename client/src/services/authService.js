import websocketService from './websocketService';

export const connectAndSend = (payload, onMessage, onError) => {
  // Register message handler for this specific request
  const messageHandler = (data) => {
    onMessage(data);
  };

  // Register handlers for common auth response types
  websocketService.onMessage('LOGIN_SUCCESS', messageHandler);
  websocketService.onMessage('LOGIN_FAIL', messageHandler);
  websocketService.onMessage('REGISTER_SUCCESS', messageHandler);
  websocketService.onMessage('REGISTER_FAIL', messageHandler);
  websocketService.onMessage('FORGOT_PASSWORD_SUCCESS', messageHandler);
  websocketService.onMessage('FORGOT_PASSWORD_FAIL', messageHandler);
  websocketService.onMessage('VALIDATE_RESET_TOKEN_SUCCESS', messageHandler);
  websocketService.onMessage('VALIDATE_RESET_TOKEN_FAIL', messageHandler);
  websocketService.onMessage('RESET_PASSWORD_SUCCESS', messageHandler);
  websocketService.onMessage('RESET_PASSWORD_FAIL', messageHandler);

  // Send the payload
  websocketService.send(payload);
};


