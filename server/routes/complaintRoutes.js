const express = require('express');
const router = express.Router();
const {
    submitComplaint,
    getMyComplaints,
    getComplaintById,
    getAdminComplaints,
    getAuthorityComplaints,
    adminAction,
    authorityAction,
    userResolve,
    updateConsent,
    requestUserData,
    escalateComplaint,
    getLawsuitInfo,
    getAllComplaints,
} = require('../controllers/complaintController');
const { protect, adminOnly, authorityOnly, adminOrAuthority } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// User routes
router.post('/', protect, upload.array('documents', 5), submitComplaint);
router.get('/my', protect, getMyComplaints);
router.get('/lawsuit-info', protect, getLawsuitInfo);
router.put('/:id/consent', protect, updateConsent);
router.put('/:id/user-resolve', protect, userResolve);
router.post('/:id/escalate', protect, escalateComplaint);

// Admin routes
router.get('/admin', protect, adminOnly, getAdminComplaints);
router.put('/:id/admin-action', protect, adminOnly, adminAction);
router.put('/:id/request-data', protect, adminOnly, requestUserData);

// Authority routes
router.get('/authority', protect, authorityOnly, getAuthorityComplaints);
router.put('/:id/authority-action', protect, authorityOnly, authorityAction);

// All roles
router.get('/all', protect, adminOrAuthority, getAllComplaints);
router.get('/:id', protect, getComplaintById);

module.exports = router;
