const express = require('express');
const router = express.Router();
const { getAlerts, getAlert, updateAlertStatus, markAllRead, getUnreadCount, getTotalCount } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.get('/total-count', getTotalCount);
router.put('/markallread', authorize('admin', 'site_engineer'), markAllRead);
router.route('/').get(getAlerts);
router.route('/:id').get(getAlert);
router.put('/:id/status', authorize('admin', 'site_engineer'), updateAlertStatus);

module.exports = router;
