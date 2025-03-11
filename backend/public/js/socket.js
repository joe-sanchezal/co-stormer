// Initialize socket with proper configuration for Vercel
const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    secure: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});
let currentUser = '';
let currentSession = '';
let currentTemplate = '';

// Connection status management
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    const statusText = statusElement.querySelector('.status-text');
    
    statusElement.className = `connection-status ${status}`;
    
    switch (status) {
        case 'connected':
            statusText.textContent = 'Connected';
            break;
        case 'disconnected':
            statusText.textContent = 'Disconnected';
            break;
        case 'connecting':
            statusText.textContent = 'Connecting...';
            break;
    }
}

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('connected');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus('disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('disconnected');
    showError('Connection error. Please try again later.');
});

socket.on('connecting', () => {
    console.log('Connecting to server...');
    updateConnectionStatus('connecting');
});

socket.on('reconnecting', () => {
    console.log('Reconnecting to server...');
    updateConnectionStatus('connecting');
});

socket.on('session-created', (data) => {
    currentSession = data.code;
    currentUser = data.username;
    showBrainstormScreen();
    displaySessionCode(data.code);
    updateUsersList(data.users);
    selectTemplate(data.template);
});

socket.on('session-joined', (data) => {
    currentSession = data.code;
    currentUser = data.username;
    showBrainstormScreen();
    displaySessionCode(data.code);
    updateUsersList(data.users);
    displayExistingIdeas(data.ideas);
    selectTemplate(data.template);
});

socket.on('user-joined', (users) => {
    updateUsersList(users);
});

socket.on('user-left', (users) => {
    updateUsersList(users);
});

socket.on('new-idea-shared', (idea) => {
    displayNewIdea(idea);
});

socket.on('todo-updated', (data) => {
    updateTodoItem(data);
});

socket.on('error-message', (message) => {
    showError(message);
});

// UI update functions
function displaySessionCode(code) {
    document.getElementById('session-code-display').textContent = code;
}

function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<h3>Participants</h3><ul>' +
        users.map(user => `<li>${user}</li>`).join('') +
        '</ul>';
}

function displayExistingIdeas(ideas) {
    const ideasContainer = document.getElementById('ideas-container');
    ideasContainer.innerHTML = '';
    ideas.forEach(idea => displayNewIdea(idea));
}

function displayNewIdea(idea) {
    const ideasContainer = document.getElementById('ideas-container');
    
    if (typeof idea === 'object' && idea.type === 'todo') {
        ideasContainer.insertAdjacentHTML('beforeend', formatTodoItem(idea));
        sortTodos();
    } else if (typeof idea === 'object' && idea.type === 'swot') {
        addSwotPoint(idea);
    } else {
        const ideaElement = document.createElement('div');
        ideaElement.className = 'idea-card';
        ideaElement.innerHTML = `
            <div class="idea-header">
                <span>${idea.user}</span>
                <span>${new Date(idea.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="idea-content">${idea.text}</div>
        `;
        ideasContainer.appendChild(ideaElement);
    }
    
    ideasContainer.scrollTop = ideasContainer.scrollHeight;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// Screen management
function showBrainstormScreen() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('create-form').style.display = 'none';
    document.getElementById('join-form').style.display = 'none';
    document.getElementById('brainstorm-container').style.display = 'block';
}

function showCreateForm() {
    document.getElementById('create-form').style.display = 'block';
    document.getElementById('join-form').style.display = 'none';
}

function showJoinForm() {
    document.getElementById('join-form').style.display = 'block';
    document.getElementById('create-form').style.display = 'none';
}

// Form submission handlers
function handleCreateSession(event) {
    event.preventDefault();
    const username = document.getElementById('create-username').value.trim();
    const topic = document.getElementById('create-topic').value.trim();
    const template = document.querySelector('input[name="template"]:checked').value;
    
    if (!username || !topic) {
        showError('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';
    
    currentTemplate = template;
    socket.emit('create-session', { username, topic, template });
    
    // Set timeout for server response
    const timeout = setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        showError('Server response timeout. Please try again.');
    }, 5000);
    
    // Clear timeout when session is created
    socket.once('session-created', () => {
        clearTimeout(timeout);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
    
    // Clear timeout on error
    socket.once('error-message', () => {
        clearTimeout(timeout);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
}

function handleJoinSession(event) {
    event.preventDefault();
    const username = document.getElementById('join-username').value.trim();
    const code = document.getElementById('join-code').value.trim();
    
    if (!username || !code) {
        showError('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Joining...';
    
    socket.emit('join-session', { username, code });
    
    // Set timeout for server response
    const timeout = setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
        showError('Server response timeout. Please try again.');
    }, 5000);
    
    // Clear timeout when session is joined
    socket.once('session-joined', () => {
        clearTimeout(timeout);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
    
    // Clear timeout on error
    socket.once('error-message', () => {
        clearTimeout(timeout);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
}

function submitIdea(event) {
    event.preventDefault();
    const ideaInput = document.getElementById('idea-input');
    const idea = ideaInput.value.trim();
    
    if (!idea) return;
    
    socket.emit('new-idea', {
        text: idea,
        session: currentSession,
        user: currentUser,
        timestamp: new Date().toISOString()
    });
    
    ideaInput.value = '';
}

// New functions for navigation and session management
function returnToHome() {
    if (confirm("Are you sure you want to leave this session and return to the home screen?")) {
        socket.emit('leave-session', { session: currentSession, username: currentUser });
        resetHomeScreen();
    }
}

function resetHomeScreen() {
    // Reset session variables
    currentSession = '';
    currentUser = '';
    currentTemplate = '';
    
    // Hide all forms first
    document.getElementById('create-form').style.display = 'none';
    document.getElementById('join-form').style.display = 'none';
    document.getElementById('brainstorm-container').style.display = 'none';
    
    // Show home screen with proper layout
    const homeScreen = document.getElementById('home-screen');
    homeScreen.style.display = 'flex';
    homeScreen.className = 'centered-content';
    
    // Clear any input fields
    document.getElementById('create-username').value = '';
    document.getElementById('create-topic').value = '';
    document.getElementById('join-username').value = '';
    document.getElementById('join-code').value = '';
    
    // Reset template selection
    document.getElementById('default-template-radio').checked = true;
}

function showEndSessionModal() {
    document.getElementById('end-session-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('end-session-modal').style.display = 'none';
}

function downloadSessionData() {
    // Request session data from server
    socket.emit('request-session-data', { session: currentSession });
    
    // Listen for the response with session data
    socket.once('session-data', (data) => {
        // Create a JSON file with the session data
        const sessionData = JSON.stringify(data, null, 2);
        const blob = new Blob([sessionData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link and trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = `stormer-session-${currentSession}-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // End the session
        endSession();
    });
}

function endSessionWithoutDownload() {
    endSession();
}

function endSession() {
    // Close the modal
    closeModal();
    
    // If user is the host, notify server to end session
    socket.emit('end-session', { session: currentSession, username: currentUser });
    
    // Reset home screen
    resetHomeScreen();
}

// Initialize connection status
updateConnectionStatus(socket.connected ? 'connected' : 'connecting'); 