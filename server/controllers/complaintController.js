const Complaint = require('../models/Complaint');
const User = require('../models/User');
const aiService = require('../services/aiService');
const escalationService = require('../services/escalationService');
const emailService = require('../services/emailService');

// @desc    Submit a new complaint
// @route   POST /api/complaints
const submitComplaint = async (req, res) => {
    try {
        const { department, heading, description, latitude, longitude, address, agreedToTerms } = req.body;

        if (!department || !heading || !description) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        if (!agreedToTerms || agreedToTerms === 'false') {
            return res.status(400).json({ message: 'You must agree to Terms & Conditions' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Anonymize the identity
        const anonymousId = user.getAnonymousId();

        // Build documents array from uploaded files
        const documents = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                documents.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    mimetype: file.mimetype,
                    size: file.size,
                });
            });
        }

        // Create complaint
        const complaint = new Complaint({
            userId: user._id,
            anonymousId,
            profileSnapshot: {
                name: anonymousId,
                age: user.age,
                gender: user.gender,
                phone: `XXXX-${user.phone.slice(-4)}`,
                voterIdLast4: user.voterID.slice(-4),
            },
            department,
            heading,
            description,
            documents,
            location: {
                latitude: parseFloat(latitude) || 0,
                longitude: parseFloat(longitude) || 0,
                address: address || 'Not provided',
            },
            agreedToTerms: true,
            statusHistory: [{
                status: 'submitted',
                message: 'Complaint has been submitted successfully.',
                timestamp: new Date(),
                updatedBy: 'system',
            }],
        });

        await complaint.save();

        // Run AI analysis in the background
        setImmediate(async () => {
            try {
                // Update status to ai_review
                complaint.status = 'ai_review';
                complaint.statusHistory.push({
                    status: 'ai_review',
                    message: 'Complaint is being analyzed by AI system.',
                    timestamp: new Date(),
                    updatedBy: 'ai_system',
                });
                await complaint.save();

                // Analyze complaint
                const analysis = await aiService.analyzeComplaint(complaint);
                complaint.aiAnalysis = analysis;

                if (analysis.isValid) {
                    // Generate government order
                    const govtOrder = await aiService.generateGovtOrder(complaint, analysis);
                    complaint.govtOrderDoc = govtOrder;
                    complaint.status = 'verified';
                    complaint.statusHistory.push({
                        status: 'verified',
                        message: `AI analysis complete. Complaint verified with score ${analysis.score}/100. Government order generated.`,
                        timestamp: new Date(),
                        updatedBy: 'ai_system',
                    });

                    // Auto-route to admin (set status to sent_to_admin)
                    complaint.status = 'sent_to_admin';
                    complaint.statusHistory.push({
                        status: 'sent_to_admin',
                        message: `Complaint routed to ${complaint.department} department admin for review.`,
                        timestamp: new Date(),
                        updatedBy: 'system',
                    });
                } else {
                    complaint.status = 'ai_rejected';
                    complaint.statusHistory.push({
                        status: 'ai_rejected',
                        message: `AI analysis flagged this complaint: ${analysis.verdict}. Flags: ${analysis.flags.join(', ')}`,
                        timestamp: new Date(),
                        updatedBy: 'ai_system',
                    });
                }

                await complaint.save();
            } catch (err) {
                console.error('AI analysis background error:', err);
            }
        });

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaintId: complaint.complaintId,
            anonymousId: complaint.anonymousId,
            complaint,
        });
    } catch (error) {
        console.error('Submit complaint error:', error);
        res.status(500).json({ message: error.message || 'Server error while submitting complaint' });
    }
};

// @desc    Get user's complaints
// @route   GET /api/complaints/my
const getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .select('-userId');

        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get complaint by ID
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Users can only see their own complaints (admin/authority can see their dept)
        if (req.userRole === 'user' && complaint.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this complaint' });
        }

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get complaints for admin's department
// @route   GET /api/complaints/admin
const getAdminComplaints = async (req, res) => {
    try {
        const query = {
            status: { $in: ['sent_to_admin', 'admin_approved', 'admin_rejected'] },
        };

        // Filter by department if admin
        if (req.user.department) {
            query.department = { $regex: new RegExp(req.user.department, 'i') };
        }

        const complaints = await Complaint.find(query).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get complaints for authority
// @route   GET /api/complaints/authority
const getAuthorityComplaints = async (req, res) => {
    try {
        const query = {
            status: { $in: ['sent_to_authority', 'replied', 'user_not_resolved', 'user_resolved', 'resolved', 'escalated', 'lawsuit_filed'] },
        };

        if (req.user.department) {
            query.department = { $regex: new RegExp(req.user.department, 'i') };
        }

        const complaints = await Complaint.find(query).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin action (approve/reject complaint)
// @route   PUT /api/complaints/:id/admin-action
const adminAction = async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (action === 'approve') {
            complaint.status = 'admin_approved';
            complaint.adminId = req.user._id;
            complaint.adminRemarks = remarks || '';
            complaint.statusHistory.push({
                status: 'admin_approved',
                message: `Complaint approved by ${req.user.name}. ${remarks ? 'Remarks: ' + remarks : ''}`,
                timestamp: new Date(),
                updatedBy: req.user.name,
            });

            // Forward to authority (use specified target or default to same department)
            const targetAuth = req.body.targetAuthority || complaint.department;
            complaint.status = 'sent_to_authority';
            complaint.escalationDeadline = escalationService.calculateDeadline();
            complaint.statusHistory.push({
                status: 'sent_to_authority',
                message: `Complaint forwarded to ${targetAuth} Authority for resolution. Deadline: ${complaint.escalationDeadline.toLocaleDateString('en-IN')}.`,
                timestamp: new Date(),
                updatedBy: req.user.name,
            });
        } else if (action === 'reject') {
            complaint.status = 'admin_rejected';
            complaint.adminId = req.user._id;
            complaint.adminRemarks = remarks || 'Complaint rejected by admin';
            complaint.statusHistory.push({
                status: 'admin_rejected',
                message: `Complaint rejected by admin. Reason: ${remarks || 'Not specified'}`,
                timestamp: new Date(),
                updatedBy: req.user.name,
            });
        } else {
            return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
        }

        await complaint.save();
        res.json({ message: `Complaint ${action}d successfully`, complaint });
    } catch (error) {
        console.error('Admin action error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Authority action - send response only
// @route   PUT /api/complaints/:id/authority-action
const authorityAction = async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (action === 'respond') {
            complaint.status = 'replied';
            complaint.authorityId = req.user._id;
            complaint.authorityRemarks = remarks || '';
            complaint.authorityResponse = remarks || '';
            complaint.statusHistory.push({
                status: 'replied',
                message: `Authority responded: ${remarks || 'Response provided'}. User can now mark this complaint as resolved or request further action.`,
                timestamp: new Date(),
                updatedBy: req.user.name,
            });
        } else {
            return res.status(400).json({ message: 'Invalid action. Use "respond"' });
        }

        await complaint.save();
        res.json({ message: 'Response sent to user successfully', complaint });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    User marks complaint as resolved or not
// @route   PUT /api/complaints/:id/user-resolve
const userResolve = async (req, res) => {
    try {
        const { accepted, feedback } = req.body;
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (complaint.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        complaint.userResolution = {
            accepted,
            feedback: feedback || '',
            resolvedAt: new Date(),
        };

        if (accepted) {
            complaint.status = 'user_resolved';
            complaint.statusHistory.push({
                status: 'user_resolved',
                message: `User marked complaint as resolved. ${feedback ? 'Feedback: ' + feedback : ''}`,
                timestamp: new Date(),
                updatedBy: 'user',
            });
        } else {
            complaint.status = 'user_not_resolved';
            complaint.statusHistory.push({
                status: 'user_not_resolved',
                message: `User marked complaint as NOT resolved. ${feedback ? 'Reason: ' + feedback : ''} Case may be escalated.`,
                timestamp: new Date(),
                updatedBy: 'user',
            });
        }

        await complaint.save();
        res.json({ message: accepted ? 'Complaint marked as resolved' : 'Complaint marked as not resolved', complaint });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    User consent to share data
// @route   PUT /api/complaints/:id/consent
const updateConsent = async (req, res) => {
    try {
        const { consent } = req.body;
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (complaint.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        complaint.userConsentForData = consent;
        complaint.statusHistory.push({
            status: complaint.status,
            message: consent
                ? 'User has consented to share personal data with the admin.'
                : 'User has declined to share personal data.',
            timestamp: new Date(),
            updatedBy: 'user',
        });

        await complaint.save();
        res.json({ message: `Data sharing ${consent ? 'accepted' : 'declined'}`, complaint });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Request user data (admin)
// @route   PUT /api/complaints/:id/request-data
const requestUserData = async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        complaint.dataRequestedByAdmin = true;
        complaint.statusHistory.push({
            status: complaint.status,
            message: 'Admin has requested access to complainant personal data. Waiting for user consent.',
            timestamp: new Date(),
            updatedBy: req.user.name,
        });

        await complaint.save();
        res.json({ message: 'Data request sent to user', complaint });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Escalate / file lawsuit
// @route   POST /api/complaints/:id/escalate
const escalateComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ complaintId: req.params.id });

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (complaint.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Generate lawsuit email
        const lawsuitEmail = escalationService.generateLawsuitEmail(complaint);

        // Send simulated email
        await emailService.sendEmail({
            to: `${complaint.department} Authority`,
            ...lawsuitEmail,
        });

        // Get lawsuit procedure
        const procedure = escalationService.getLawsuitProcedure();

        complaint.status = 'lawsuit_filed';
        complaint.lawsuitDetails = {
            filed: true,
            filedAt: new Date(),
            emailContent: lawsuitEmail.body,
            reference: lawsuitEmail.reference,
        };
        complaint.statusHistory.push({
            status: 'lawsuit_filed',
            message: 'Lawsuit notice has been sent to the authority. Legal proceedings initiated.',
            timestamp: new Date(),
            updatedBy: 'user',
        });

        await complaint.save();

        res.json({
            message: 'Lawsuit filed successfully',
            complaint,
            lawsuitEmail,
            procedure,
        });
    } catch (error) {
        console.error('Escalation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get lawsuit procedure info
// @route   GET /api/complaints/lawsuit-info
const getLawsuitInfo = async (req, res) => {
    try {
        const procedure = escalationService.getLawsuitProcedure();
        res.json(procedure);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all complaints (for admin dashboard stats)
// @route   GET /api/complaints/all
const getAllComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find().sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};
