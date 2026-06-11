const express = require('express');
const router = express.Router();
const { createReading, getReadings, getLatestReadings, getStats } = require('../controllers/readingController');
const { protect } = require('../middleware/auth');
 
router.use(protect);
router.get('/latest', getLatestReadings);
router.get('/stats', getStats);
 
router.route('/').get(getReadings).post(createReading);

 
module.exports = router;