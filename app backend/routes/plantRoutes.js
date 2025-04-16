const express = require('express');
const router = express.Router();
const { sendAddPlantCommand } = require('../services/plantService');

router.post('/add-plant', async (req, res) => {
    const { plantId, desiredMoisture, wateringTime } = req.body;

    try {
        await sendAddPlantCommand(plantId, desiredMoisture, wateringTime);
        res.status(200).json({ message: 'Command sent to Raspberry Pi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
