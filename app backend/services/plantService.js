const { sendToPi } = require('../ws/piConnection');

async function sendAddPlantCommand(plantId, desiredMoisture, wateringTime) {
    const command = {
        type: 'add_plant',
        plantId,
        desiredMoisture,
        wateringTime
    };
    sendToPi(command);
}

module.exports = { sendAddPlantCommand };
