require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
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
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

testConnection(); 