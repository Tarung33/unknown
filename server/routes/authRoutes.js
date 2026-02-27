const express = require('express');
const router = express.Router();
const { registerUser, loginUser, loginAdmin, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin/login', loginAdmin);
router.get('/profile', protect, getProfile);

module.exports = router;
