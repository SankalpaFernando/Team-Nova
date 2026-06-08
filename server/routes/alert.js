const express = require('express');
const router = express.Router();
const { getAlerts, getAlert, updateAlertStatus, markAllRead, getUnreadCount } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.put('/markallread', markAllRead);
router.route('/').get(getAlerts);
router.route('/:id').get(getAlert);
router.put('/:id/status', updateAlertStatus);

module.exports = router;
