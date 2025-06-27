const availableSensors = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const availableValves = [201, 202, 203, 204, 205, 206, 207, 208, 209, 210];

function assignSensor() {
  return availableSensors.length > 0 ? availableSensors.shift() : null;
}

function assignValve() {
  return availableValves.length > 0 ? availableValves.shift() : null;
}

function releaseSensor(sensorId) {
  availableSensors.push(sensorId);
}

function releaseValve(valveId) {
  availableValves.push(valveId);
}

module.exports = {
  assignSensor,
  assignValve,
  releaseSensor,
  releaseValve
};