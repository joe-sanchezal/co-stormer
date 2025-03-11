const mongoose = require('mongoose');
require('dotenv').config();

// Connection state tracking
let isConnected = false;

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  process.exit(1);
}

// Connect to MongoDB
async function connectToDatabase() {
  if (isConnected) {
    console.log('=> Using existing database connection');
    return;
  }

  console.log('=> Creating new database connection');
  
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    isConnected = db.connections[0].readyState === 1; // 1 = connected
    console.log('=> Database connected successfully');
    
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

module.exports = { connectToDatabase }; 