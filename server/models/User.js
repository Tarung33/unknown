const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    voterID: {
        type: String,
        required: [true, 'Voter ID is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: 18,
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
        default: '',
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getAnonymousId = function () {
    const last4 = this.voterID.slice(-4);
    return `Unknown-${last4}`;
};

module.exports = mongoose.model('User', userSchema);
