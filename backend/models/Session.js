const mongoose = require('mongoose');

// Define the schema for ideas within a session
const ideaSchema = new mongoose.Schema({
  text: String,
  user: String,
  timestamp: { type: Date, default: Date.now },
  type: { type: String, default: 'idea' }, // 'idea', 'todo', 'swot'
  // Todo specific fields
  priority: String,
  dueDate: String,
  completed: { type: Boolean, default: false },
  id: String,
  // SWOT specific fields
  category: String
});

// Define the session schema
const sessionSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  topic: { 
    type: String, 
    required: true 
  },
  template: { 
    type: String, 
    required: true,
    enum: ['default', 'todo', 'swot']
  },
  users: [String],
  ideas: [ideaSchema],
  host: String,
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 86400 // Automatically delete after 24 hours (in seconds)
  }
});

// Create and export the model
const Session = mongoose.model('Session', sessionSchema);

module.exports = Session; 