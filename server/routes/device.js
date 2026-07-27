const express = require('express');
const router = express.Router();
const {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  regenerateApiKey
} = require('../controllers/deviceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getDevices);
router.get('/:id', getDevice);

router.post('/', authorize('admin', 'site_engineer'), createDevice);
router.put('/:id', authorize('admin', 'site_engineer'), updateDevice);
router.delete('/:id', authorize('admin', 'site_engineer'), deleteDevice);
router.put('/:id/regen-key', authorize('admin', 'site_engineer'), regenerateApiKey);

module.exports = router;
