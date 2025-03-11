// Get the current URL for Socket.IO connection
const currentUrl = window.location.origin;
console.log("Connecting to Socket.IO at:", currentUrl);

// Initialize socket with proper configuration for Vercel
let socket;
try {
    socket = io(currentUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        secure: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    console.log("Socket.IO initialized successfully");
} catch (error) {
    console.error("Error initializing Socket.IO:", error);
    // Show error to user
    setTimeout(() => {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = "Failed to connect to server. Please refresh the page.";
            errorDiv.style.display = 'block';
        }
    }, 1000);
}

// Define variables after socket initialization
let currentUser = '';
let currentSession = '';
let currentTemplate = '';

// Connection status management
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const statusText = statusElement.querySelector('.status-text');
    if (!statusText) return;
    
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
if (socket) {
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
    
    // Initialize connection status
    updateConnectionStatus(socket.connected ? 'connected' : 'connecting');
    
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
}

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
    
    if (!socket || !socket.connected) {
        showError('Not connected to server. Please refresh the page.');
        return;
    }
    
    const username = document.getElementById('create-username').value.trim();
    const topic = document.getElementById('create-topic').value.trim();
    const templateRadio = document.querySelector('input[name="template"]:checked');
    
    if (!username || !topic || !templateRadio) {
        showError('Please fill in all fields');
        return;
    }
    
    const template = templateRadio.value;
    
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
    
    if (!socket || !socket.connected) {
        showError('Not connected to server. Please refresh the page.');
        return;
    }
    
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

function selectTemplate(template) {
    const todoSection = document.getElementById('todo-template');
    const swotSection = document.getElementById('swot-template');
    const defaultSection = document.getElementById('default-template');
    const ideasContainer = document.getElementById('ideas-container');
    
    if (!todoSection || !swotSection || !defaultSection || !ideasContainer) {
        console.error('Required DOM elements not found');
        return;
    }
    
    todoSection.style.display = 'none';
    swotSection.style.display = 'none';
    defaultSection.style.display = 'none';
    
    switch (template) {
        case 'todo':
            todoSection.style.display = 'block';
            ideasContainer.innerHTML = '';
            break;
        case 'swot':
            swotSection.style.display = 'block';
            // Initialize SWOT quadrants
            ideasContainer.innerHTML = `
                <div id="strengths-quadrant" class="swot-quadrant strengths">
                    <h4>Strengths</h4>
                    <div class="swot-points"></div>
                </div>
                <div id="weaknesses-quadrant" class="swot-quadrant weaknesses">
                    <h4>Weaknesses</h4>
                    <div class="swot-points"></div>
                </div>
                <div id="opportunities-quadrant" class="swot-quadrant opportunities">
                    <h4>Opportunities</h4>
                    <div class="swot-points"></div>
                </div>
                <div id="threats-quadrant" class="swot-quadrant threats">
                    <h4>Threats</h4>
                    <div class="swot-points"></div>
                </div>
            `;
            initSwotNavigation();
            break;
        default:
            defaultSection.style.display = 'block';
            ideasContainer.innerHTML = '';
            break;
    }
    
    currentTemplate = template;
}

function updateTodoItem(data) {
    const todoItem = document.getElementById(`todo-${data.id}`);
    if (todoItem) {
        if (data.completed) {
            todoItem.classList.add('completed');
        } else {
            todoItem.classList.remove('completed');
        }
    }
}

function sortTodos() {
    const ideasContainer = document.getElementById('ideas-container');
    if (!ideasContainer) return;
    
    const todos = Array.from(ideasContainer.getElementsByClassName('todo-item'));
    
    todos.sort((a, b) => {
        // Get the dates
        const dateA = new Date(a.querySelector('.todo-date')?.textContent || '');
        const dateB = new Date(b.querySelector('.todo-date')?.textContent || '');
        
        // If dates are different, sort by date
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        
        // If dates are the same, sort by priority
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityA = a.classList.contains('high-priority') ? 'high' :
                         a.classList.contains('medium-priority') ? 'medium' : 'low';
        const priorityB = b.classList.contains('high-priority') ? 'high' :
                         b.classList.contains('medium-priority') ? 'medium' : 'low';
        
        return priorityOrder[priorityA] - priorityOrder[priorityB];
    });
    
    // Reappend sorted todos
    todos.forEach(todo => ideasContainer.appendChild(todo));
}

function formatTodoItem(todo) {
    return `
        <div id="todo-${todo.id}" class="todo-item ${todo.priority}-priority ${todo.completed ? 'completed' : ''}">
            <div class="todo-checkbox" onclick="toggleTodo('${todo.id}')">
                ${todo.completed ? '✓' : ''}
            </div>
            <div class="todo-content">
                <div class="todo-text">${todo.text}</div>
                <div class="todo-meta">
                    <span class="todo-priority">${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority</span> | 
                    <span class="todo-date">${todo.dueDate}</span> | 
                    <span class="todo-user">Added by ${todo.user}</span>
                </div>
            </div>
        </div>
    `;
}

function addSwotPoint(swot) {
    const container = document.querySelector(`#${swot.category}-quadrant .swot-points`);
    if (container) {
        const pointElement = document.createElement('div');
        pointElement.className = 'swot-point';
        pointElement.innerHTML = `
            <div class="swot-point-content">${swot.text}</div>
            <div class="swot-point-meta">
                <span>${swot.user}</span>
                <span>${new Date(swot.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
        container.appendChild(pointElement);
    }
}

function initSwotNavigation() {
    // Set strengths as active by default
    setTimeout(() => {
        scrollToSwotSection('strengths');
    }, 100);
    
    // Add intersection observer to update active state on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target.id.replace('-quadrant', '');
                document.querySelectorAll('.swot-nav-button').forEach(btn => btn.classList.remove('active'));
                document.querySelector(`.swot-nav-button.${section}`)?.classList.add('active');
            }
        });
    }, { threshold: 0.5 });
    
    // Observe all quadrants
    document.querySelectorAll('.swot-quadrant').forEach(quadrant => {
        observer.observe(quadrant);
    });
}

function scrollToSwotSection(section) {
    // Remove active class from all buttons and quadrants
    document.querySelectorAll('.swot-nav-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.swot-quadrant').forEach(quad => quad.classList.remove('active'));
    
    // Add active class to selected button and quadrant
    const button = document.querySelector(`.swot-nav-button.${section}`);
    const quadrant = document.getElementById(`${section}-quadrant`);
    
    if (button) button.classList.add('active');
    if (quadrant) {
        quadrant.classList.add('active');
        quadrant.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleTodo(id) {
    if (!socket || !socket.connected) {
        showError('Not connected to server. Please refresh the page.');
        return;
    }
    
    socket.emit('toggle-todo', {
        id: id,
        session: currentSession
    });
} 