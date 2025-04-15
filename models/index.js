const mongoose = require('mongoose');
const userSchema = require('./User');

// Register the User model
mongoose.model('User', userSchema);

// Export the models
module.exports = {
    User: mongoose.model('User')
}; 