# Stormer - Collaborative Brainstorming Application

Stormer is a real-time collaborative brainstorming application that allows users to create and join brainstorming sessions over a local area network (LAN). The application features multiple templates for different types of collaborative work.

## Features

- **Real-time Collaboration**: Multiple users can join the same session and see updates in real-time
- **Multiple Templates**:
  - **Classic Brainstorming**: Free-form ideation with real-time collaboration
  - **To-Do List**: Organize tasks with priorities and due dates
  - **SWOT Analysis**: Analyze Strengths, Weaknesses, Opportunities, and Threats
- **Session Management**: Create or join sessions using unique session codes
- **User Tracking**: See who's currently participating in the session
- **Modern UI**: Clean and intuitive interface with a dark theme

## Templates

### To-Do List
- Add tasks with priority levels (High, Medium, Low)
- Set due dates for tasks
- Mark tasks as complete/incomplete
- Automatic sorting by priority and date
- Task count tracking

### SWOT Analysis
- Four-quadrant layout for Strengths, Weaknesses, Opportunities, and Threats
- Quick navigation buttons to each section
- Color-coded sections for better visualization
- Real-time updates across all participants

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd stormer
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Open `http://localhost:3001` in your browser
   - Share the application on your LAN by using your computer's IP address (e.g., `http://192.168.1.100:3001`)

## Project Structure

```
backend/
├── public/
│   ├── css/
│   │   ├── main.css
│   │   ├── templates.css
│   │   └── layout.css
│   ├── js/
│   │   ├── socket.js
│   │   └── templates.js
│   └── index.html
├── server.js
└── package.json
```

## Usage

1. **Creating a Session**:
   - Click "Create Session"
   - Enter your name and session topic
   - Choose a template
   - Share the session code with others

2. **Joining a Session**:
   - Click "Join Session"
   - Enter your name and the session code
   - Start collaborating!

3. **Using Templates**:
   - **To-Do List**: Add tasks with priorities and due dates
   - **SWOT Analysis**: Add points to any of the four quadrants
   - **Classic Brainstorming**: Share ideas in free-form text

## Technical Stack

- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Frontend**: Vanilla JavaScript
- **Styling**: CSS3 with CSS Variables

## Contributing

Feel free to submit issues and enhancement requests! 