// Todo List Template Functions
function submitTodo(event) {
    event.preventDefault();
    const todoInput = document.getElementById('todo-input');
    const prioritySelect = document.getElementById('todo-priority');
    const dateInput = document.getElementById('todo-date');
    
    const todoText = todoInput.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dateInput.value;
    
    if (!todoText || !priority || !dueDate) {
        showError('Please fill in all todo fields');
        return;
    }
    
    const todoItem = {
        type: 'todo',
        text: todoText,
        priority,
        dueDate,
        completed: false,
        id: Date.now().toString(),
        user: currentUser,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('new-idea', {
        ...todoItem,
        session: currentSession
    });
    
    todoInput.value = '';
    prioritySelect.value = 'medium';
    dateInput.value = '';
}

function formatTodoItem(todo) {
    const date = new Date(todo.dueDate);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = `${dayName}, ${date.getMonth() + 1}/${date.getDate()}`;
    
    return `
        <div class="todo-item ${todo.priority}-priority ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <div class="todo-checkbox" onclick="toggleTodo('${todo.id}')">
                ${todo.completed ? '✓' : ''}
            </div>
            <div class="todo-content">
                <div class="todo-text">${todo.text}</div>
                <div class="todo-meta">
                    <span class="todo-date">${formattedDate}</span>
                    <span class="todo-user">${todo.user}</span>
                </div>
            </div>
        </div>
    `;
}

function toggleTodo(id) {
    socket.emit('toggle-todo', {
        id,
        session: currentSession
    });
}

function updateTodoItem(data) {
    const todoItem = document.querySelector(`.todo-item[data-id="${data.id}"]`);
    if (todoItem) {
        if (data.completed) {
            todoItem.classList.add('completed');
            todoItem.querySelector('.todo-checkbox').innerHTML = '✓';
        } else {
            todoItem.classList.remove('completed');
            todoItem.querySelector('.todo-checkbox').innerHTML = '';
        }
    }
}

function sortTodos() {
    const ideasContainer = document.getElementById('ideas-container');
    const todos = Array.from(ideasContainer.getElementsByClassName('todo-item'));
    
    todos.sort((a, b) => {
        // Get the dates
        const dateA = new Date(a.querySelector('.todo-date').textContent);
        const dateB = new Date(b.querySelector('.todo-date').textContent);
        
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

// SWOT Analysis Template Functions
function submitSwot(event) {
    event.preventDefault();
    const swotInput = document.getElementById('swot-input');
    const swotType = document.getElementById('swot-type').value;
    const text = swotInput.value.trim();
    
    if (!text || !swotType) {
        showError('Please fill in all SWOT fields');
        return;
    }
    
    const swotPoint = {
        type: 'swot',
        text,
        category: swotType,
        id: Date.now().toString(),
        user: currentUser,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('new-idea', {
        ...swotPoint,
        session: currentSession
    });
    
    swotInput.value = '';
}

function addSwotPoint(swot) {
    const quadrant = document.getElementById(`${swot.category}-quadrant`);
    const pointElement = document.createElement('div');
    pointElement.className = 'swot-point';
    pointElement.innerHTML = `
        <div class="swot-point-text">${swot.text}</div>
        <div class="swot-point-meta">
            <span class="swot-point-user">${swot.user}</span>
            <span class="swot-point-time">${new Date(swot.timestamp).toLocaleTimeString()}</span>
        </div>
    `;
    quadrant.querySelector('.swot-points').appendChild(pointElement);
}

function scrollToSwotSection(section) {
    // Remove active class from all buttons and quadrants
    document.querySelectorAll('.swot-nav-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.swot-quadrant').forEach(quad => quad.classList.remove('active'));
    
    // Add active class to selected button and quadrant
    document.querySelector(`.swot-nav-button.${section}`).classList.add('active');
    const quadrant = document.getElementById(`${section}-quadrant`);
    quadrant.classList.add('active');
    
    // Smooth scroll to the quadrant
    quadrant.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize SWOT navigation
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
                document.querySelector(`.swot-nav-button.${section}`).classList.add('active');
            }
        });
    }, { threshold: 0.5 });
    
    // Observe all quadrants
    document.querySelectorAll('.swot-quadrant').forEach(quadrant => {
        observer.observe(quadrant);
    });
}

// Template Selection
function selectTemplate(template) {
    const todoSection = document.getElementById('todo-template');
    const swotSection = document.getElementById('swot-template');
    const defaultSection = document.getElementById('default-template');
    const ideasContainer = document.getElementById('ideas-container');
    
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