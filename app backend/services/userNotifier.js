const { sendSuccess } = require('../utils/wsResponses');
const { getSocketByEmail } = require('../models/userSessions');

function notifyUserOfSensorUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    console.log(`[NOTIFY] Sensor assigned: plant=${plant.id} port=${plant.sensor_port} email=${email}`);
    sendSuccess(ws, 'SENSOR_ASSIGNED', { plantId: plant.id, sensorPort: plant.sensor_port });
  } else {
    console.log(`[NOTIFY] Warning: User not connected - email=${email}`);
  }
}

function notifyUserOfValveUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    console.log(`[NOTIFY] Valve assigned: plant=${plant.id} valve=${plant.valveId} email=${email}`);
    sendSuccess(ws, 'VALVE_ASSIGNED', { plantId: plant.id, valveId: plant.valveId });
  } else {
    console.log(`[NOTIFY] Warning: User not connected - email=${email}`);
  }
}

function notifyUserReadyToConnect(plantId, { sensorPort, valveId, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    console.log(`[NOTIFY] Ready to connect: plant=${plantId} sensor=${sensorPort} valve=${valveId} email=${email}`);
    sendSuccess(ws, 'READY_TO_CONNECT', { plantId, sensorPort, valveId });
  } else {
    console.log(`[NOTIFY] Warning: User not connected - email=${email}`);
  }
}

function notifyUserOfIrrigationComplete({ plantName, email, irrigationData }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const { water_added_liters, final_moisture, initial_moisture } = irrigationData;
    const moistureIncrease = final_moisture - initial_moisture;
    const liters = Number(water_added_liters || 0);
    const litersStr = liters.toFixed(2);

    console.log(`[NOTIFY] Irrigation complete: plant=${plantName} water=${litersStr}L moisture=${initial_moisture}%→${final_moisture}% email=${email}`);
    sendSuccess(ws, 'IRRIGATION_COMPLETE', {
      message: `Smart irrigation completed for "${plantName}"!\nWater added: ${litersStr}L\nMoisture: ${initial_moisture}% → ${final_moisture}% (+${moistureIncrease.toFixed(1)}%)`,
      plantName,
      irrigationData: { ...irrigationData, water_added_liters: liters }
    });
  }
}

function notifyUserOfIrrigationSkipped({ plantName, email, reason }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    console.log(`[NOTIFY] Irrigation skipped: plant=${plantName} reason=${reason} email=${email}`);
    sendSuccess(ws, 'IRRIGATION_SKIPPED', {
      message: `Smart irrigation skipped for "${plantName}": ${reason}`,
      plantName,
      reason
    });
  }
}

function notifyUserOfIrrigationError({ plantName, email, errorMessage }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    console.log(`[NOTIFY] Irrigation error: plant=${plantName} error=${errorMessage} email=${email}`);
    sendSuccess(ws, 'IRRIGATION_ERROR', {
      message: `Smart irrigation failed for "${plantName}": ${errorMessage}`,
      plantName,
      errorMessage
    });
  }
}

function notifyUserOfIrrigationStart({ plantName, email, initialMoisture, targetMoisture }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    const moistureGap = targetMoisture - initialMoisture;
    console.log(`[NOTIFY] Irrigation started: plant=${plantName} current=${initialMoisture}% target=${targetMoisture}% gap=${moistureGap.toFixed(1)}% email=${email}`);
    sendSuccess(ws, 'IRRIGATION_STARTED', {
      message: `Smart irrigation started for "${plantName}"!\nCurrent moisture: ${initialMoisture}%\nTarget moisture: ${targetMoisture}%\nMoisture gap: ${moistureGap.toFixed(1)}%`,
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