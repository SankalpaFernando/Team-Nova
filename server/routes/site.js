const express = require('express');
const router = express.Router();

const { 
  getSites, 
  getSite, 
  createSite, 
  updateSite, 
  deleteSite,
  assignEngineer,
  unassignEngineer,
  updateThresholds
} = require('../controllers/siteController');

const { protect, authorize, authorizeSiteAccess } = require('../middleware/auth');

router.get('/', getSites);
router.get('/:id', getSite);

router.post('/', protect, authorize('admin'), createSite);
router.put('/:id', protect, authorize('admin', 'site_engineer'), updateSite);
router.delete('/:id', protect, authorize('admin'), deleteSite);

router.put('/:id/assign-engineer', protect, authorize('admin'), assignEngineer);
router.put('/:id/unassign-engineer', protect, authorize('admin'), unassignEngineer);
router.put('/:id/thresholds', protect, authorize('admin', 'site_engineer'), updateThresholds);

module.exports = router;