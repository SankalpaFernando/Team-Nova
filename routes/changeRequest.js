const express = require('express');
const router = express.Router();
const {
  getChangeRequests,
  getPendingCount,
  approveChangeRequest,
  rejectChangeRequest
} = require('../controllers/changeRequestController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'site_engineer'), getChangeRequests);
router.get('/pending-count', authorize('admin'), getPendingCount);
router.put('/:id/approve', authorize('admin'), approveChangeRequest);
router.put('/:id/reject', authorize('admin'), rejectChangeRequest);

module.exports = router;
