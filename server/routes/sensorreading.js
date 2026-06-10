const express = require('express');
const router = express.Router();
const { createReading, getReadings, getLatestReadings, getStats } = require('../controllers/readingController');
const { protect } = require('../middleware/auth');
 
router.use(protect);
 
router.route('/').get(getReadings).post(createReading);
router.get('/latest', getLatestReadings);
router.get('/stats', getStats);
 
module.exports = router;