const express = require('express');
const router = express.Router();
const { getDevices, getDevice, createDevice, updateDevice, deleteDevice } = require('../controllers/deviceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getDevices);
router.get('/:id', getDevice);

// 🔒 Admin only
router.post('/', protect, authorize('admin'), createDevice);
router.put('/:id', protect, authorize('admin'), updateDevice);
router.delete('/:id', protect, authorize('admin'), deleteDevice);

module.exports = router;
// router.use(protect);

// router.route('/')
//   .get(getDevices)
//   .post(authorize('admin'), createDevice);

// router.route('/:id')
//   .get(getDevice)
//   .put(authorize('admin'), updateDevice)
//   .delete(authorize('admin'), deleteDevice);

// module.exports = router;
