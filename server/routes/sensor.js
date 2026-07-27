const express = require('express');
const router = express.Router();

const {
  getSensors,
  getSensor,
  createSensor,
  updateSensor,
  deleteSensor
} = require('../controllers/sensorController');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSensors)
  .post(authorize('admin', 'site_engineer'), createSensor);

router.route('/:id')
  .get(getSensor)
  .put(authorize('admin', 'site_engineer'), updateSensor)
  .delete(authorize('admin', 'site_engineer'), deleteSensor);

module.exports = router;
