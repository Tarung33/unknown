const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        default: '',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: String,
        default: 'system',
    },
});

const complaintSchema = new mongoose.Schema({
    complaintId: {
        type: String,
        unique: true,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    anonymousId: {
        type: String,
        required: true,
    },
    // Profile snapshot (anonymized)
    profileSnapshot: {
        name: String,
        age: Number,
        gender: String,
        phone: String,
        voterIdLast4: String,
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
    },
    heading: {
        type: String,
        required: [true, 'Complaint heading is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Complaint description is required'],
    },
    documents: [{
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
    }],
    location: {
        latitude: Number,
        longitude: Number,
        address: String,
    },
    status: {
        type: String,
        enum: [
            'submitted',
            'ai_review',
            'ai_rejected',
            'verified',
            'sent_to_admin',
            'admin_approved',
            'admin_rejected',
            'sent_to_authority',
            'replied',           // authority sent a response
            'user_resolved',     // user marked as resolved
            'user_not_resolved', // user marked as not resolved
            'resolved',
            'escalated',
            'lawsuit_filed',
        ],
        default: 'submitted',
    },
    statusHistory: [statusHistorySchema],
    aiAnalysis: {
        isValid: { type: Boolean, default: null },
        score: { type: Number, default: 0 },
        verdict: { type: String, default: '' },
        flags: [String],
        category: { type: String, default: '' },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical', ''], default: '' },
        analyzedAt: Date,
    },
    govtOrderDoc: {
        content: String,
        generatedAt: Date,
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    adminRemarks: {
        type: String,
        default: '',
    },
    authorityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    authorityRemarks: {
        type: String,
        default: '',
    },
    authorityResponse: {       // message shown to user after authority replies
        type: String,
        default: '',
    },
    userResolution: {          // what user decided after seeing authority reply
        accepted: { type: Boolean, default: null },
        feedback: { type: String, default: '' },
        resolvedAt: Date,
    },
    embedding: {               // Gemini vector embedding for semantic search
        type: [Number],
        default: [],
        select: false,         // don't return by default (large array)
    },
    escalationDeadline: {
        type: Date,
        default: null,
    },
    userConsentForData: {
        type: Boolean,
        default: null,
    },
    dataRequestedByAdmin: {
        type: Boolean,
        default: false,
    },
    lawsuitDetails: {
        filed: { type: Boolean, default: false },
        filedAt: Date,
        emailContent: String,
        reference: String,
    },
    agreedToTerms: {
        type: Boolean,
        required: true,
        default: false,
    },
}, {
    timestamps: true,
});

const Counter = require('./Counter');

// Generate complaint ID before saving
complaintSchema.pre('validate', async function (next) {
    if (!this.complaintId) {
        try {
            // Atomically increment the sequence
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'complaintId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true } // Create if doesn't exist
            );

            // If the database already had CS-000012 before we added this counter,
            // we need to sync the counter to start higher than 12.
            // On the first run, let's fast-forward it if needed.
            if (counter.seq === 1) {
                const highest = await mongoose.model('Complaint').findOne({}, 'complaintId').sort({ createdAt: -1 });
                if (highest && highest.complaintId) {
                    const parts = highest.complaintId.split('-');
                    if (parts.length === 2 && !isNaN(parts[1])) {
                        const maxVal = parseInt(parts[1], 10);
                        if (maxVal >= 1) {
                            counter.seq = maxVal + 1;
                            await counter.save();
                        }
                    }
                }
            }

            const padded = String(counter.seq).padStart(6, '0');
            this.complaintId = `CS-${padded}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
