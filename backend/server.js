// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { connectToDatabase } = require("./db/connection");
const Session = require("./models/Session");
require('dotenv').config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS for socket.io in production
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  path: '/socket.io',
  transports: ['polling', 'websocket'], // Prioritize polling over websockets for Vercel
  pingTimeout: 60000, // Increase timeout for Vercel
  pingInterval: 25000, // Adjust ping interval
  serveClient: false, // Don't serve the client, we're using CDN
  allowUpgrades: false, // Prevent transport upgrade to websocket
  cookie: false, // Disable cookies
  perMessageDeflate: false // Disable WebSocket compression
});

// Log when the server starts
console.log("Server starting...");
console.log("Environment:", process.env.NODE_ENV);
console.log("Vercel URL:", process.env.VERCEL_URL);

// Add debug logging for Socket.IO
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", err);
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check endpoint for Vercel
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV, 
    url: process.env.VERCEL_URL,
    socketio: "configured",
    timestamp: new Date().toISOString()
  });
});

// Socket.IO status endpoint
app.get("/api/socket-status", (req, res) => {
  const status = {
    socketConnected: io.engine.clientsCount > 0,
    activeConnections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  };
  
  // Get active sessions count from database
  Session.countDocuments()
    .then(count => {
      status.activeSessions = count;
      res.json(status);
    })
    .catch(err => {
      console.error("Error counting sessions:", err);
      status.error = "Failed to count sessions";
      res.json(status);
    });
});

// Database status endpoint
app.get("/api/db-status", async (req, res) => {
  try {
    await connectToDatabase();
    const sessionCount = await Session.countDocuments();
    const recentSessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('code topic template users createdAt');
    
    res.json({
      status: "connected",
      sessionCount,
      recentSessions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database status error:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate a unique session code
function generateSessionCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Connect to database when server starts
connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
  });

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected with ID:", socket.id);
  let currentSession = null;

  // Handle session creation
  socket.on("create-session", async (data) => {
    console.log("Creating session with data:", data);
    
    try {
      // Generate a unique code
      let code;
      let isUnique = false;
      
      while (!isUnique) {
        code = generateSessionCode();
        const existingSession = await Session.findOne({ code });
        if (!existingSession) {
          isUnique = true;
        }
      }
      
      // Create new session in database
      const session = new Session({
        code,
        topic: data.topic,
        template: data.template,
        users: [data.username],
        ideas: [],
        host: socket.id
      });
      
      await session.save();
      
      socket.join(code);
      socket.username = data.username;
      socket.session = code;
      
      console.log(`Session created: ${code} by ${data.username}`);
      
      socket.emit("session-created", {
        code,
        username: data.username,
        topic: data.topic,
        template: data.template,
        users: session.users
      });
    } catch (error) {
      console.error("Error creating session:", error);
      socket.emit("error-message", "Failed to create session. Please try again.");
    }
  });

  // Handle session joining
  socket.on("join-session", async (data) => {
    console.log("Join session request:", data);
    
    try {
      const session = await Session.findOne({ code: data.code });
      
      if (!session) {
        console.log(`Session not found: ${data.code}`);
        socket.emit("error-message", "Session not found");
        return;
      }
      
      if (session.users.includes(data.username)) {
        console.log(`Username already taken: ${data.username}`);
        socket.emit("error-message", "Username already taken");
        return;
      }
      
      // Add user to session
      session.users.push(data.username);
      await session.save();
      
      socket.join(data.code);
      socket.username = data.username;
      socket.session = data.code;
      
      console.log(`User ${data.username} joined session ${data.code}`);
      
      socket.emit("session-joined", {
        code: data.code,
        username: data.username,
        topic: session.topic,
        template: session.template,
        users: session.users,
        ideas: session.ideas
      });
      
      socket.to(data.code).emit("user-joined", session.users);
    } catch (error) {
      console.error("Error joining session:", error);
      socket.emit("error-message", "Failed to join session. Please try again.");
    }
  });

  // Handle new idea submission
  socket.on("new-idea", async (data) => {
    try {
      const session = await Session.findOne({ code: data.session });
      if (!session) return;
      
      session.ideas.push(data);
      await session.save();
      
      io.to(data.session).emit("new-idea-shared", data);
    } catch (error) {
      console.error("Error adding idea:", error);
      socket.emit("error-message", "Failed to add idea. Please try again.");
    }
  });

  // Handle todo toggle
  socket.on("toggle-todo", async (data) => {
    try {
      const session = await Session.findOne({ code: data.session });
      if (!session) return;
      
      const todo = session.ideas.find(idea => idea.id === data.id);
      if (todo && todo.type === 'todo') {
        todo.completed = !todo.completed;
        await session.save();
        
        io.to(data.session).emit("todo-updated", todo);
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
      socket.emit("error-message", "Failed to update task. Please try again.");
    }
  });

  // Handle leave session
  socket.on("leave-session", async (data) => {
    if (data.session) {
      try {
        const session = await Session.findOne({ code: data.session });
        if (session) {
          session.users = session.users.filter(user => user !== data.username);
          
          if (session.users.length === 0) {
            await Session.deleteOne({ code: data.session });
          } else {
            await session.save();
            io.to(data.session).emit("user-left", session.users);
          }
          
          socket.leave(data.session);
          socket.session = null;
          socket.username = null;
        }
      } catch (error) {
        console.error("Error leaving session:", error);
      }
    }
  });

  // Handle request for session data
  socket.on("request-session-data", async (data) => {
    try {
      const session = await Session.findOne({ code: data.session });
      if (session) {
        socket.emit("session-data", {
          code: session.code,
          topic: session.topic,
          template: session.template,
          users: session.users,
          ideas: session.ideas,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error requesting session data:", error);
      socket.emit("error-message", "Failed to get session data. Please try again.");
    }
  });

  // Handle end session
  socket.on("end-session", async (data) => {
    try {
      const session = await Session.findOne({ code: data.session });
      if (session && session.host === socket.id) {
        io.to(data.session).emit("session-ended", { message: "The host has ended this session." });
        await Session.deleteOne({ code: data.session });
      }
    } catch (error) {
      console.error("Error ending session:", error);
      socket.emit("error-message", "Failed to end session. Please try again.");
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    if (socket.session) {
      try {
        const session = await Session.findOne({ code: socket.session });
        if (session) {
          session.users = session.users.filter(user => user !== socket.username);
          
          if (session.users.length === 0) {
            await Session.deleteOne({ code: socket.session });
          } else {
            await session.save();
            io.to(socket.session).emit("user-left", session.users);
          }
        }
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  server.listen(PORT, () => {
    console.log(`Server running in production mode on port ${PORT}`);
  });
}

// For Vercel serverless functions
module.exports = app;

// Also export server for Socket.IO
module.exports.server = server;