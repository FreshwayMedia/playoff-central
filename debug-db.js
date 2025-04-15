require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testConnection() {
  try {
    console.log('Step 1: Attempting to connect to MongoDB...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    mongoose.set('debug', true);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      ssl: true,
      authSource: 'admin',
    });
    
    console.log('Step 2: Successfully connected to MongoDB!');
    
    // Test User model operations
    console.log('Step 3: Testing User model operations...');
    
    // Try to find a user
    console.log('Step 4: Attempting to find a user...');
    const existingUser = await User.findOne({ email: 'test@example.com' });
    console.log('Existing user:', existingUser);
    
    if (!existingUser) {
      // Create a test user
      console.log('Step 5: Creating test user...');
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      
      await user.save();
      console.log('Test user created successfully!');
    } else {
      console.log('Test user already exists');
    }
    
  } catch (error) {
    console.error('Error occurred:', error);
    if (error.name === 'MongoServerError') {
      console.error('Authentication failed. Please check username and password.');
    }
    if (error.name === 'MongoNetworkError') {
      console.error('Network error. Please check your connection and MongoDB URI.');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    process.exit();
  }
}

testConnection(); 