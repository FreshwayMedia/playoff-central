require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Successfully connected to MongoDB!');
        
        // Test a simple query
        const User = mongoose.model('User', new mongoose.Schema({
            name: String,
            email: String,
            password: String
        }));
        
        const count = await User.countDocuments();
        console.log(`Found ${count} users in the database`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

testConnection(); 