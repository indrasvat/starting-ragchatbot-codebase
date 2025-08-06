// API base URL - use relative path to work from any host
const API_URL = '/api';

// Global state
let currentSessionId = null;

// DOM elements
let chatMessages, chatInput, sendButton, totalCourses, courseTitles;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements after page loads
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    totalCourses = document.getElementById('totalCourses');
    courseTitles = document.getElementById('courseTitles');
    
    setupEventListeners();
    createNewSession();
    loadCourseStats();
    initializeTheme();
    setupMobileMenu();
});

// Event Listeners
function setupEventListeners() {
    // Chat functionality
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    
    // Suggested questions
    document.querySelectorAll('.suggested-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            chatInput.value = question;
            sendMessage();
        });
    });
    
    // Theme switcher
    document.querySelectorAll('.theme-option').forEach(button => {
        button.addEventListener('click', (e) => {
            const theme = e.currentTarget.getAttribute('data-theme');
            setTheme(theme);
        });
    });
}


// Chat Functions
async function sendMessage() {
    const query = chatInput.value.trim();
    if (!query) return;

    // Disable input
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;

    // Add user message
    addMessage(query, 'user');

    // Add loading message - create a unique container for it
    const loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                session_id: currentSessionId
            })
        });

        if (!response.ok) throw new Error('Query failed');

        const data = await response.json();
        
        // Update session ID if new
        if (!currentSessionId) {
            currentSessionId = data.session_id;
        }

        // Replace loading message with response
        loadingMessage.remove();
        addMessage(data.answer, 'assistant', data.sources);

    } catch (error) {
        // Replace loading message with error
        loadingMessage.remove();
        addMessage(`Error: ${error.message}`, 'assistant');
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

function createLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    return messageDiv;
}

function addMessage(content, type, sources = null, isWelcome = false) {
    const messageId = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}${isWelcome ? ' welcome-message' : ''}`;
    messageDiv.id = `message-${messageId}`;
    
    // Convert markdown to HTML for assistant messages
    const displayContent = type === 'assistant' ? marked.parse(content) : escapeHtml(content);
    
    let html = `<div class="message-content">${displayContent}</div>`;
    
    if (sources && sources.length > 0) {
        html += `
            <details class="sources-collapsible">
                <summary class="sources-header">Sources</summary>
                <div class="sources-content">${sources.join(', ')}</div>
            </details>
        `;
    }
    
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// Helper function to escape HTML for user messages
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Removed removeMessage function - no longer needed since we handle loading differently

async function createNewSession() {
    currentSessionId = null;
    chatMessages.innerHTML = '';
    addMessage('Welcome to the Course Materials Assistant! I can help you with questions about courses, lessons and specific content. What would you like to know?', 'assistant', null, true);
}

// Load course statistics
async function loadCourseStats() {
    try {
        console.log('Loading course stats...');
        const response = await fetch(`${API_URL}/courses`);
        if (!response.ok) throw new Error('Failed to load course stats');
        
        const data = await response.json();
        console.log('Course data received:', data);
        
        // Update stats in UI
        if (totalCourses) {
            totalCourses.textContent = data.total_courses;
        }
        
        // Update course titles
        if (courseTitles) {
            if (data.course_titles && data.course_titles.length > 0) {
                courseTitles.innerHTML = data.course_titles
                    .map(title => `<div class="course-title-item">${title}</div>`)
                    .join('');
            } else {
                courseTitles.innerHTML = '<span class="no-courses">No courses available</span>';
            }
        }
        
    } catch (error) {
        console.error('Error loading course stats:', error);
        // Set default values on error
        if (totalCourses) {
            totalCourses.textContent = '0';
        }
        if (courseTitles) {
            courseTitles.innerHTML = '<span class="error">Failed to load courses</span>';
        }
    }
}

// Theme Management Functions
function initializeTheme() {
    // Get saved theme from localStorage, default to 'default'
    const savedTheme = localStorage.getItem('chat-theme') || 'default';
    setTheme(savedTheme, false); // false = don't animate on initial load
}

function setTheme(themeName, animate = true) {
    const html = document.documentElement;
    const body = document.body;
    
    // Add theme-changing class to disable transitions temporarily if not animating
    if (!animate) {
        body.classList.add('theme-changing');
    }
    
    // Set the theme data attribute
    html.setAttribute('data-theme', themeName);
    
    // Update active state of theme buttons
    document.querySelectorAll('.theme-option').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-theme') === themeName);
    });
    
    // Save theme preference
    localStorage.setItem('chat-theme', themeName);
    
    // Add special terminal effects for terminal theme
    if (themeName === 'terminal') {
        addTerminalEffects();
    } else {
        removeTerminalEffects();
    }
    
    // Remove theme-changing class after a short delay
    if (!animate) {
        setTimeout(() => {
            body.classList.remove('theme-changing');
        }, 50);
    }
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: themeName } 
    }));
}

function addTerminalEffects() {
    // Add terminal cursor effect to input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.style.caretColor = '#00ff41';
    }
    
    // Add terminal typing sound effect simulation (visual feedback)
    document.addEventListener('keydown', terminalKeyEffect);
}

function removeTerminalEffects() {
    // Reset input cursor
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.style.caretColor = '';
    }
    
    // Remove terminal typing effect
    document.removeEventListener('keydown', terminalKeyEffect);
}

function terminalKeyEffect(e) {
    // Only apply to chat input
    if (e.target.id === 'chatInput') {
        // Create subtle glow effect on typing
        const input = e.target;
        input.style.textShadow = '0 0 10px currentColor';
        
        setTimeout(() => {
            input.style.textShadow = '0 0 5px currentColor';
        }, 100);
    }
}

// Add keyboard shortcut for theme switching
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + T to toggle themes
    if ((e.ctrlKey || e.metaKey) && e.key === 't' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'default';
        const newTheme = currentTheme === 'default' ? 'terminal' : 'default';
        setTheme(newTheme);
    }
});

// Performance optimization: debounced theme change
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export theme functions for potential external use
window.themeManager = {
    setTheme,
    getCurrentTheme: () => document.documentElement.getAttribute('data-theme') || 'default',
    getAvailableThemes: () => ['default', 'terminal']
};

// Mobile Menu Functions
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    
    // Load mobile course stats
    loadMobileCourseStats();
    
    // Mobile menu event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', hideMobileMenu);
    }
    
    if (mobileOverlay) {
        // Close on overlay click (not on sheet)
        mobileOverlay.addEventListener('click', (e) => {
            if (e.target === mobileOverlay) {
                hideMobileMenu();
            }
        });
    }
    
    // Setup mobile theme switcher event listeners
    document.querySelectorAll('.mobile-sheet .theme-option').forEach(button => {
        button.addEventListener('click', (e) => {
            const theme = e.currentTarget.getAttribute('data-theme');
            setTheme(theme);
            // Update mobile theme button states
            updateMobileThemeButtons(theme);
        });
    });
    
    // Setup mobile suggested questions
    document.querySelectorAll('.mobile-sheet .suggested-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.getAttribute('data-question');
            chatInput.value = question;
            hideMobileMenu();
            sendMessage();
        });
    });
}

function toggleMobileMenu() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        if (mobileOverlay.classList.contains('active')) {
            hideMobileMenu();
        } else {
            showMobileMenu();
        }
    }
}

function showMobileMenu() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.classList.add('active');
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
    }
}

function hideMobileMenu() {
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.classList.remove('active');
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

function updateMobileThemeButtons(currentTheme) {
    document.querySelectorAll('.mobile-sheet .theme-option').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-theme') === currentTheme);
    });
}

// Load course statistics for mobile menu
async function loadMobileCourseStats() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        if (!response.ok) throw new Error('Failed to load course stats');
        
        const data = await response.json();
        
        // Update mobile stats
        const totalCoursesMobile = document.getElementById('totalCoursesMobile');
        const courseTitlesMobile = document.getElementById('courseTitlesMobile');
        
        if (totalCoursesMobile) {
            totalCoursesMobile.textContent = data.total_courses;
        }
        
        if (courseTitlesMobile) {
            if (data.course_titles && data.course_titles.length > 0) {
                courseTitlesMobile.innerHTML = data.course_titles
                    .map(title => `<div class="course-title-item">${title}</div>`)
                    .join('');
            } else {
                courseTitlesMobile.innerHTML = '<span class="no-courses">No courses available</span>';
            }
        }
        
    } catch (error) {
        console.error('Error loading mobile course stats:', error);
        const totalCoursesMobile = document.getElementById('totalCoursesMobile');
        const courseTitlesMobile = document.getElementById('courseTitlesMobile');
        
        if (totalCoursesMobile) {
            totalCoursesMobile.textContent = '0';
        }
        if (courseTitlesMobile) {
            courseTitlesMobile.innerHTML = '<span class="error">Failed to load courses</span>';
        }
    }
}

// Update mobile theme buttons when theme changes
window.addEventListener('themeChanged', (e) => {
    updateMobileThemeButtons(e.detail.theme);
});

// Handle escape key to close mobile menu
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideMobileMenu();
    }
});