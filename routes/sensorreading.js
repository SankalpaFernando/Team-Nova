const express = require('express');
const router = express.Router();
const { createReading, getReadings, getLatestReadings, getStats } = require('../controllers/sensorreadingController');
const { protect } = require('../middleware/auth');
const { authenticateDeviceOrUser } = require('../middleware/deviceAuth');

router.get('/latest', protect, getLatestReadings);
router.get('/stats', protect, getStats);

router.route('/')
  .get(protect, getReadings)
  .post(authenticateDeviceOrUser, createReading);

module.exports = router;