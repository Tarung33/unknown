const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const escalationService = require('./services/escalationService');
const localEmbedding = require('./services/localEmbedding');
const Admin = require('./models/Admin');
const { protect, adminOnly } = require('./middleware/authMiddleware');
const { getAuthorities } = require('./controllers/authController');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

// Authorities list — used by admin dropdown to forward complaints
app.get('/api/authorities', protect, adminOnly, getAuthorities);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Department definitions
const DEPARTMENTS = [
    { key: 'municipal', name: 'Municipal Corporation', desc: 'Roads, drainage, sanitation, building permits' },
    { key: 'publicworks', name: 'Public Works Department', desc: 'Highways, bridges, government buildings' },
    { key: 'revenue', name: 'Revenue Department', desc: 'Land records, property tax, registrations' },
    { key: 'health', name: 'Health Department', desc: 'Hospitals, public health, disease control' },
    { key: 'education', name: 'Education Department', desc: 'Schools, colleges, scholarships, exams' },
    { key: 'transport', name: 'Transport Department', desc: 'Licenses, permits, public transport, traffic' },
    { key: 'police', name: 'Police Department', desc: 'Law & order, FIR, safety, crime reports' },
    { key: 'electricity', name: 'Electricity Department', desc: 'Power supply, billing, outages, connections' },
    { key: 'water', name: 'Water Supply Department', desc: 'Water supply, pipelines, sewage, contamination' },
    { key: 'environment', name: 'Environment Department', desc: 'Pollution, waste management, green initiatives' },
];

// Departments API
app.get('/api/departments', (req, res) => {
    res.json(DEPARTMENTS);
});

// Authorities list API (for admin to select who to forward to)
app.get('/api/authorities', async (req, res) => {
    try {
        const authorities = await Admin.find({ role: 'authority' }).select('name email department designation phone');
        res.json(authorities);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed default admin and authority accounts
const AUTHORITY_DETAILS = {
    'municipal': { name: 'Rajan Mehta', designation: 'Municipal Commissioner', phone: '9800100001' },
    'publicworks': { name: 'Sunita Verma', designation: 'Chief Engineer, PWD', phone: '9800100002' },
    'revenue': { name: 'Arvind Sharma', designation: 'District Revenue Officer', phone: '9800100003' },
    'health': { name: 'Dr. Priya Nair', designation: 'Chief Medical Officer', phone: '9800100004' },
    'education': { name: 'Kavitha Reddy', designation: 'District Education Officer', phone: '9800100005' },
    'transport': { name: 'Harish Kumar', designation: 'Regional Transport Commissioner', phone: '9800100006' },
    'police': { name: 'SP Ramesh Pandey', designation: 'Superintendent of Police', phone: '9800100007' },
    'electricity': { name: 'Mohan Das', designation: 'Divisional Engineer, DISCOM', phone: '9800100008' },
    'water': { name: 'Lalitha Bai', designation: 'Executive Engineer, Water Supply', phone: '9800100009' },
    'environment': { name: 'Deepak Joshi', designation: 'Regional Environment Officer', phone: '9800100010' },
};

const seedAdmins = async () => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const defaultAccounts = [];

            for (const dept of DEPARTMENTS) {
                const authDetail = AUTHORITY_DETAILS[dept.key] || {};
                // Admin for each department
                defaultAccounts.push({
                    name: `${dept.name} Admin`,
                    email: `admin@${dept.key}.gov`,
                    password: 'admin123',
                    department: dept.name,
                    role: 'admin',
                    designation: `${dept.name} Admin Officer`,
                });
                // Authority - real named person
                defaultAccounts.push({
                    name: authDetail.name || `${dept.name} Authority`,
                    email: `authority@${dept.key}.gov`,
                    password: 'authority123',
                    department: dept.name,
                    role: 'authority',
                    designation: authDetail.designation || `${dept.name} Authority`,
                    phone: authDetail.phone || '',
                });
            }

            for (const account of defaultAccounts) {
                await Admin.create(account);
            }
            console.log(`✅ ${defaultAccounts.length} admin/authority accounts seeded`);
        }
    } catch (error) {
        console.error('Seeding error:', error.message);
    }
};

seedAdmins();

// Cron job: Check escalations every hour
cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running escalation check...');
    const count = await escalationService.checkEscalations();
    if (count > 0) {
        console.log(`⚠️ ${count} complaint(s) escalated due to non-response`);
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`\n🛡️  Civic Shield Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API: http://localhost:${PORT}/api\n`);

    // Backfill TF-IDF embeddings for existing complaints (after DB connects)
    setTimeout(() => localEmbedding.backfillEmbeddings(), 5000);
});
