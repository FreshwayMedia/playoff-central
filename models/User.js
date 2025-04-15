const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Add timestamps for better tracking
    timestamps: true,
    // Ensure indexes are created
    autoIndex: true,
    // Disable buffering to prevent timeout issues
    bufferCommands: false,
    // Add collection name explicitly
    collection: 'users',
    // Add write concern for better reliability
    writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 30000
    }
});

// Create indexes with a timeout
userSchema.index({ email: 1 }, { 
    unique: true,
    background: true,
    expireAfterSeconds: 0
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Add better error handling for duplicate key errors
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError') {
        if (error.code === 11000) {
            next(new Error('Email already exists'));
        } else if (error.code === 50) {
            next(new Error('Database operation timeout'));
        } else {
            next(new Error(`Database error: ${error.message}`));
        }
    } else {
        next(error);
    }
});

// Create indexes with consistent options
const createIndexes = async () => {
    try {
        await mongoose.model('User').createIndexes();
    } catch (error) {
        if (error.code !== 85) { // Ignore IndexOptionsConflict error
            console.error('Error creating indexes:', error);
        }
    }
};

// Initialize indexes after model compilation
const User = mongoose.model('User', userSchema);
createIndexes();

module.exports = User; 