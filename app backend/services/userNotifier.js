const { sendSuccess } = require('../utils/wsResponses');
const { getSocketByEmail } = require('../models/userSessions');

function notifyUserOfSensorUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'SENSOR_ASSIGNED', { plantId: plant.id, sensorPort: plant.sensor_port });
  }
}

function notifyUserOfValveUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'VALVE_ASSIGNED', { plantId: plant.id, valveId: plant.valveId });
  }
}

function notifyUserReadyToConnect(plantId, { sensorPort, valveId, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'READY_TO_CONNECT', { plantId, sensorPort, valveId });
  }
}

function notifyUserOfIrrigationComplete({ plantName, email, irrigationData }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const { water_added_liters, final_moisture, initial_moisture } = irrigationData;
    const moistureIncrease = final_moisture - initial_moisture;
    
    let message = `🌱 Smart irrigation completed for "${plantName}"!`;
    message += `\n💧 Water added: ${water_added_liters}L`;
    message += `\n📊 Moisture: ${initial_moisture}% → ${final_moisture}% (+${moistureIncrease.toFixed(1)}%)`;
    
    sendSuccess(ws, 'IRRIGATION_COMPLETE', {
      message,
      plantName,
      irrigationData
    });
  }
}

function notifyUserOfIrrigationSkipped({ plantName, email, reason }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const message = `🌱 Smart irrigation skipped for "${plantName}": ${reason}`;
    
    sendSuccess(ws, 'IRRIGATION_SKIPPED', {
      message,
      plantName,
      reason
    });
  }
}

function notifyUserOfIrrigationError({ plantName, email, errorMessage }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const message = `❌ Smart irrigation failed for "${plantName}": ${errorMessage}`;
    
    sendSuccess(ws, 'IRRIGATION_ERROR', {
      message,
      plantName,
      errorMessage
    });
  }
}

function notifyUserOfIrrigationStart({ plantName, email, initialMoisture, targetMoisture }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const moistureGap = targetMoisture - initialMoisture;
    let message = `🚰 Smart irrigation started for "${plantName}"!`;
    message += `\n📊 Current moisture: ${initialMoisture}%`;
    message += `\n🎯 Target moisture: ${targetMoisture}%`;
    message += `\n💧 Moisture gap: ${moistureGap.toFixed(1)}%`;
    
    sendSuccess(ws, 'IRRIGATION_STARTED', {
      message,
      plantName,
      initialMoisture,
      targetMoisture,
      moistureGap
    });
  }
}

module.exports = {
  notifyUserOfSensorUpdate,
  notifyUserOfValveUpdate,
  notifyUserReadyToConnect,
  notifyUserOfIrrigationComplete,
  notifyUserOfIrrigationSkipped,
  notifyUserOfIrrigationError,
  notifyUserOfIrrigationStart,
};