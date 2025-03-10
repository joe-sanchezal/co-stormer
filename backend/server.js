// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Store sessions, users and ideas
const sessions = new Map();

function generateSessionCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (sessions.has(code));
  return code;
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected");
  let currentSession = null;

  // Handle session creation
  socket.on("create-session", (data) => {
    const code = generateSessionCode();
    const session = {
      code,
      topic: data.topic,
      template: data.template,
      users: [data.username],
      ideas: [],
      host: socket.id
    };
    
    sessions.set(code, session);
    socket.join(code);
    socket.username = data.username;
    socket.session = code;
    
    socket.emit("session-created", {
      code,
      username: data.username,
      topic: data.topic,
      template: data.template,
      users: session.users
    });
  });

  // Handle session joining
  socket.on("join-session", (data) => {
    const session = sessions.get(data.code);
    if (!session) {
      socket.emit("error-message", "Session not found");
      return;
    }
    
    if (session.users.includes(data.username)) {
      socket.emit("error-message", "Username already taken");
      return;
    }
    
    socket.join(data.code);
    socket.username = data.username;
    socket.session = data.code;
    session.users.push(data.username);
    
    socket.emit("session-joined", {
      code: data.code,
      username: data.username,
      topic: session.topic,
      template: session.template,
      users: session.users,
      ideas: session.ideas
    });
    
    socket.to(data.code).emit("user-joined", session.users);
  });

  // Handle new idea submission
  socket.on("new-idea", (data) => {
    const session = sessions.get(data.session);
    if (!session) return;
    
    session.ideas.push(data);
    io.to(data.session).emit("new-idea-shared", data);
  });

  // Handle todo toggle
  socket.on("toggle-todo", (data) => {
    const session = sessions.get(data.session);
    if (!session) return;
    
    const todo = session.ideas.find(idea => idea.id === data.id);
    if (todo && todo.type === 'todo') {
      todo.completed = !todo.completed;
      io.to(data.session).emit("todo-updated", todo);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    if (socket.session) {
      const session = sessions.get(socket.session);
      if (session) {
        session.users = session.users.filter(user => user !== socket.username);
        
        if (session.users.length === 0) {
          sessions.delete(socket.session);
        } else {
          io.to(socket.session).emit("user-left", session.users);
        }
      }
    }
  });
  
  // Handle leave session
  socket.on("leave-session", (data) => {
    if (data.session) {
      const session = sessions.get(data.session);
      if (session) {
        session.users = session.users.filter(user => user !== data.username);
        
        if (session.users.length === 0) {
          sessions.delete(data.session);
        } else {
          io.to(data.session).emit("user-left", session.users);
        }
        
        socket.leave(data.session);
        socket.session = null;
        socket.username = null;
      }
    }
  });
  
  // Handle request for session data
  socket.on("request-session-data", (data) => {
    const session = sessions.get(data.session);
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
  });
  
  // Handle end session
  socket.on("end-session", (data) => {
    const session = sessions.get(data.session);
    if (session && session.host === socket.id) {
      io.to(data.session).emit("session-ended", { message: "The host has ended this session." });
      sessions.delete(data.session);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});