require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    mongoose.set('debug', true); // Enable debug logging
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000,
      ssl: true,
      authSource: 'admin',
    });
    
    console.log('Successfully connected to MongoDB!');
    
    // Try to create a test collection
    const testCollection = mongoose.connection.collection('test');
    await testCollection.insertOne({ test: 'connection test', timestamp: new Date() });
    console.log('Successfully wrote to database!');
    
    // Clean up
    await testCollection.deleteOne({ test: 'connection test' });
    console.log('Successfully cleaned up test data!');
    
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
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