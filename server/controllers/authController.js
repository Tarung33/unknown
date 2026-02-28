const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { voterID, name, age, gender, phone, address, password } = req.body;

        if (!voterID || !name || !age || !gender || !phone || !password) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const userExists = await User.findOne({ voterID: voterID.toUpperCase() });
        if (userExists) {
            return res.status(400).json({ message: 'Voter ID already registered' });
        }

        const user = await User.create({
            voterID: voterID.toUpperCase(),
            name,
            age,
            gender,
            phone,
            address: address || '',
            password,
        });

        res.status(201).json({
            _id: user._id,
            voterID: user.voterID,
            name: user.name,
            age: user.age,
            gender: user.gender,
            phone: user.phone,
            address: user.address,
            role: 'user',
            token: generateToken(user._id, 'user'),
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: error.message || 'Server error during registration' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { voterID, password } = req.body;

        if (!voterID || !password) {
            return res.status(400).json({ message: 'Please provide Voter ID and password' });
        }

        const user = await User.findOne({ voterID: voterID.toUpperCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid Voter ID or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Voter ID or password' });
        }

        res.json({
            _id: user._id,
            voterID: user.voterID,
            name: user.name,
            age: user.age,
            gender: user.gender,
            phone: user.phone,
            address: user.address,
            role: 'user',
            token: generateToken(user._id, 'user'),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Login admin/authority
// @route   POST /api/auth/admin/login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await admin.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            department: admin.department,
            role: admin.role,
            token: generateToken(admin._id, admin.role),
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
    try {
        res.json({
            _id: req.user._id,
            voterID: req.user.voterID,
            name: req.user.name,
            age: req.user.age,
            gender: req.user.gender,
            phone: req.user.phone,
            address: req.user.address,
            email: req.user.email,
            department: req.user.department,
            role: req.userRole,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all authorities (for admin dropdown)
// @route   GET /api/authorities
const getAuthorities = async (req, res) => {
    try {
        const authorities = await Admin.find({ role: 'authority' })
            .select('name email department designation phone')
            .sort({ department: 1, name: 1 });
        res.json(authorities);
    } catch (error) {
        console.error('Get authorities error:', error);
        res.status(500).json({ message: 'Server error fetching authorities' });
    }
};

module.exports = { registerUser, loginUser, loginAdmin, getProfile, getAuthorities };
