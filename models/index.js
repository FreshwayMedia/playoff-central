const mongoose = require('mongoose');
const userSchema = require('./User');

// Register the User model
const User = mongoose.model('User', userSchema);

// Export the models
module.exports = {
    User
}; 