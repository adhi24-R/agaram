// --- Environment Configuration Fetching ---
let apiKey = "";
let jsonBinKey = "";
let jsonBinId = "";

// Function to fetch config from server
async function fetchConfig() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        apiKey = config.GEMINI_API;
        jsonBinKey = config.JSON_MASTER_ID;
        jsonBinId = config.JSON_BIN_ID;
        console.log("Environment configuration loaded.");
    } catch (error) {
        console.error("Failed to load config:", error);
        alert("Server configuration error. Ensure server.js is running.");
    }
}

// --- Tools Data ---
const tools = {
    'story': {
        name: 'தமிழ் கதை உருவாக்கி',
        systemPrompt: "நீங்கள் ஒரு உலகத்தரம் வாய்ந்த தமிழ் கதை எழுத்தாளர். பயனர் கேட்கும் கருவுக்கு ஏற்ப, அழகான தமிழ் நடையில், தொடக்கம், திருப்பம் மற்றும் முடிவுடன் சுவாரஸ்யமான கதையை எழுத வேண்டும்."
    },
    'poem': {
        name: 'தமிழ் கவிதை உருவாக்கி',
        systemPrompt: "நீங்கள் ஒரு தமிழ் கவிஞர். பயனர் கேட்கும் தலைப்பில் (காதல், இயற்கை, சோகம், ஊக்கம்) அழகான, சந்தம் மிகுந்த தமிழ் கவிதைகளை எழுத வேண்டும்."
    },
    'news': {
        name: 'செய்தி விளக்கி',
        systemPrompt: "நீங்கள் ஒரு திறமையான செய்தி ஆசிரியர். பயனர் கொடுக்கும் செய்தி அல்லது தலைப்பை மிக எளிமையான தமிழில் விளக்க வேண்டும். இறுதியில் 'முக்கிய குறிப்புகள்' என்று பட்டியலிட்டு காட்ட வேண்டும்."
    },
    'chat': {
        name: 'தமிழ் உதவியாளர்',
        systemPrompt: "நீங்கள் ஒரு புத்திசாலித்தனமான மற்றும் அன்பான தமிழ் உதவியாளர். பயனர் கேட்கும் கேள்விகளுக்கு துல்லியமாகவும், தெளிவாகவும் தமிழில் மட்டுமே பதில் அளிக்க வேண்டும்."
    }
};

// --- State Management ---
let chatSessions = [];
let currentSessionId = null;
let isTempMode = false;
let currentUser = null;
let isSignupMode = false;

// --- Initialization ---
window.onload = async function() {
    lucide.createIcons();
    await fetchConfig(); // Load keys first!

    // Check if logged in
    const savedUser = localStorage.getItem('tamilAI_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('intro-overlay').classList.add('hidden');
        loadUserData();
    } else {
        // Not logged in: Intro is visible by default via CSS
        // Ensure Login overlay is hidden
        document.getElementById('login-overlay').classList.remove('active');
    }
};

// --- Navigation Logic ---

function showLoginPage() {
    document.getElementById('intro-overlay').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('login-overlay').classList.add('active');
    }, 500); // Wait for transition
}

// --- Authentication Logic ---

function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtn = document.getElementById('toggle-btn');

    if (isSignupMode) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'block';
        toggleText.innerText = "ஏற்கனவே கணக்கு உள்ளதா?";
        toggleBtn.innerText = "உள்நுழைய";
    } else {
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'none';
        toggleText.innerText = "கணக்கு இல்லையா?";
        toggleBtn.innerText = "உருவாக்க";
    }
}

function toggleResetMode() {
    const authForms = document.getElementById('auth-forms');
    const resetForm = document.getElementById('reset-form');
    const resetSuccess = document.getElementById('reset-success');
    const resetInputs = document.getElementById('reset-inputs');

    // Reset success state when switching
    resetSuccess.style.display = 'none';
    resetInputs.style.display = 'block';

    if (resetForm.style.display === 'block') {
        resetForm.style.display = 'none';
        authForms.style.display = 'block';
    } else {
        authForms.style.display = 'none';
        resetForm.style.display = 'block';
    }
}

// Generic function to toggle password visibility
function toggleInputPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('svg') || btn.querySelector('i');

    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
        input.type = "password";
        btn.innerHTML = '<i data-lucide="eye"></i>';
    }
    lucide.createIcons();
}

async function handleLogin() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) {
        alert("பெயர் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.");
        return;
    }

    const btn = document.getElementById('login-btn');
    btn.innerText = "சரிபார்க்கிறது...";
    btn.disabled = true;

    try {
        if (!jsonBinKey || !jsonBinId) {
            throw new Error("Configuration Missing: JSONBin keys not configured.");
        }

        const response = await fetch(`https://api.jsonbin.io/v3/b/${jsonBinId}/latest`, {
            headers: {
                'X-Master-Key': jsonBinKey
            }
        });

        if (!response.ok) throw new Error("JSONBin Connection Error");

        const data = await response.json();
        const users = data.record.users || [];
        const user = users.find(u => u.username === username && u.password === btoa(password));

        if (user) {
            completeLogin(user);
        } else {
            alert("தவறான பயனர் பெயர் அல்லது கடவுச்சொல்.");
        }
    } catch (e) {
        console.error(e);
        alert("பிழை: " + e.message);
    } finally {
        btn.innerText = "உள்நுழைய";
        btn.disabled = false;
    }
}

async function handleSignup() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!username || !password) {
        alert("விவரங்களை உள்ளிடவும்.");
        return;
    }

    const newUser = {
        username,
        password: btoa(password),
        chats: []
    };

    const btn = document.getElementById('signup-btn');
    btn.innerText = "சேமிக்கிறது...";
    btn.disabled = true;

    try {
        if (!jsonBinKey || !jsonBinId) {
            throw new Error("Configuration Missing: JSONBin keys not configured.");
        }

        // Fetch existing
        let req = await fetch(`https://api.jsonbin.io/v3/b/${jsonBinId}/latest`, {
            headers: {
                'X-Master-Key': jsonBinKey
            }
        });
        let data = await req.json();
        let record = data.record;
        if (!record.users) record = {
            users: []
        };

        // Check duplicate
        if (record.users.find(u => u.username === username)) {
            alert("இந்த பெயர் ஏற்கனவே உள்ளது.");
            btn.innerText = "கணக்கு உருவாக்க";
            btn.disabled = false;
            return;
        }

        record.users.push(newUser);

        // Push update
        let updateReq = await fetch(`https://api.jsonbin.io/v3/b/${jsonBinId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': jsonBinKey
            },
            body: JSON.stringify(record)
        });

        if (updateReq.ok) {
            alert("கணக்கு உருவாக்கப்பட்டது! இப்போது உள்நுழையவும்.");
            toggleAuthMode();
        } else {
            throw new Error("Update Failed");
        }

    } catch (e) {
        console.error(e);
        alert("பிழை: " + e.message);
    } finally {
        btn.innerText = "கணக்கு உருவாக்க";
        btn.disabled = false;
    }
}

async function handlePasswordReset() {
    const username = document.getElementById('reset-username').value.trim();
    const email = document.getElementById('reset-email').value.trim();

    if (!username) {
        alert("தயவுசெய்து உங்கள் பயனர் பெயரை உள்ளிடவும்.");
        return;
    }
    if (!email) {
        alert("தயவுசெய்து உங்கள் மின்னஞ்சலை உள்ளிடவும்.");
        return;
    }

    const btn = document.getElementById('reset-btn');
    btn.innerText = "அனுப்புகிறது...";
    btn.disabled = true;

    const newPassword = Math.random().toString(36).slice(-8);
    const encodedPassword = btoa(newPassword);

    if (!jsonBinKey || !jsonBinId) {
        alert("Configuration Missing: JSONBin keys not configured.");
        btn.innerText = "புதிய கடவுச்சொல் பெறுக";
        btn.disabled = false;
        return;
    }

    try {
        let req = await fetch(`https://api.jsonbin.io/v3/b/${jsonBinId}/latest`, {
            headers: {
                'X-Master-Key': jsonBinKey
            }
        });
        let data = await req.json();
        let record = data.record;

        const userIndex = record.users.findIndex(u => u.username === username);

        if (userIndex !== -1) {
            record.users[userIndex].password = encodedPassword;

            let updateReq = await fetch(`https://api.jsonbin.io/v3/b/${jsonBinId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': jsonBinKey
                },
                body: JSON.stringify(record)
            });

            if (updateReq.ok) {
                document.getElementById('reset-inputs').style.display = 'none';
                const successDiv = document.getElementById('reset-success');
                successDiv.style.display = 'block';
                document.getElementById('generated-pass').value = newPassword;
            } else {
                throw new Error("Update Failed");
            }
        } else {
            alert("இந்த பெயரில் பயனர் கணக்கு இல்லை.");
        }

    } catch (e) {
        console.error(e);
        alert("பிழை ஏற்பட்டது: " + e.message);
    } finally {
        btn.innerText = "புதிய கடவுச்சொல் பெறுக";
        btn.disabled = false;
    }
}

function completeLogin(user) {
    currentUser = user;
    localStorage.setItem('tamilAI_user', JSON.stringify(user));
    document.getElementById('login-overlay').classList.remove('active'); // Hide login
    loadUserData();
    startNewChat(); // Init UI
}

function logout() {
    localStorage.removeItem('tamilAI_user');
    currentUser = null;
    location.reload();
}

// --- Data Loading ---

function loadUserData() {
    const key = `tamilAI_sessions_${currentUser.username}`;
    chatSessions = JSON.parse(localStorage.getItem(key) || '[]');
    renderHistoryList();
}

function saveUserData() {
    if (!currentUser) return;
    const key = `tamilAI_sessions_${currentUser.username}`;
    localStorage.setItem(key, JSON.stringify(chatSessions));
}

// --- Core Logic ---

function startNewChat() {
    currentSessionId = Date.now().toString();
    const toolId = document.getElementById('tool-select').value;

    document.getElementById('chat-container').innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-icon"><i data-lucide="sparkles"></i></div>
            <h2>வணக்கம், ${currentUser ? currentUser.username : ''}!</h2>
            <p style="color: #52525b; margin-top: 10px;">நான் உங்கள் தமிழ் AI. நாம் என்ன செய்யலாம்?</p>
        </div>
    `;
    lucide.createIcons();

    renderHistoryList();

    if (window.innerWidth <= 768) {
        closeSidebarMobile();
    }
}

function toggleTempMode() {
    isTempMode = !isTempMode;
    const toggleBtn = document.getElementById('temp-toggle');
    toggleBtn.classList.toggle('active');

    if (isTempMode) {
        toggleBtn.style.color = '#f59e0b';
        document.getElementById('chat-container').innerHTML = '';
        appendMessage("தற்காலிக பயன்முறை ஆன். வரலாறு சேமிக்கப்படாது.", "ai");
        currentSessionId = "temp_" + Date.now();
    } else {
        toggleBtn.style.color = '#71717a';
        startNewChat();
    }
}

function loadSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    currentSessionId = sessionId;
    document.getElementById('tool-select').value = session.toolId || 'chat';

    const container = document.getElementById('chat-container');
    container.innerHTML = '';

    session.messages.forEach(msg => {
        appendMessage(msg.text, msg.role, false);
    });

    renderHistoryList();

    if (window.innerWidth <= 768) {
        closeSidebarMobile();
    }
}

function saveSession(text, role) {
    if (isTempMode) return;

    let session = chatSessions.find(s => s.id === currentSessionId);

    if (!session) {
        session = {
            id: currentSessionId,
            title: text.substring(0, 30) + "...",
            toolId: document.getElementById('tool-select').value,
            messages: []
        };
        chatSessions.unshift(session);
    }

    session.messages.push({
        text,
        role
    });

    saveUserData(); // Save to persistence
    renderHistoryList();
}

// New function to delete a session
function deleteSession(event, sessionId) {
    event.stopPropagation(); // Prevent triggering the click to load session

    if (!confirm("இந்த உரையாடலை நீக்க விரும்புகிறீர்களா?")) return;

    // Remove from array
    chatSessions = chatSessions.filter(s => s.id !== sessionId);
    // Update storage
    saveUserData();

    // If deleted session was current one, reset or switch
    if (currentSessionId === sessionId) {
        startNewChat();
    } else {
        renderHistoryList();
    }
}

function renderHistoryList() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    chatSessions.forEach(session => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;

        itemDiv.innerHTML = `
            <div class="history-text">
                <i data-lucide="message-square" size="14"></i>
                <span>${session.title}</span>
            </div>
            <button class="delete-chat-btn" onclick="deleteSession(event, '${session.id}')" title="Delete Chat">
                <i data-lucide="trash-2" size="14"></i>
            </button>
        `;

        itemDiv.onclick = () => loadSession(session.id);
        list.appendChild(itemDiv);
    });
    lucide.createIcons();
}

function appendMessage(text, role, animate = true) {
    const container = document.getElementById('chat-container');
    if (container.querySelector('.welcome-screen')) {
        container.innerHTML = '';
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    let contentHtml = role === 'ai' ?
        text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') :
        text;

    msgDiv.innerHTML = contentHtml;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

async function handleSend() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = '24px';

    appendMessage(text, 'user');
    saveSession(text, 'user');

    showTypingIndicator();

    const toolId = document.getElementById('tool-select').value;
    const tool = tools[toolId];

    // Build history context for API
    let history = [];
    let session = chatSessions.find(s => s.id === currentSessionId);
    if (session && !isTempMode) {
        // Convert stored format to API format
        history = session.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{
                text: m.text
            }]
        }));
    }

    // If temp mode, we need to construct it manually.
    if (isTempMode) {
        history.push({
            role: 'user',
            parts: [{
                text: text
            }]
        });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: history,
                systemInstruction: {
                    parts: [{
                        text: tool.systemPrompt
                    }]
                }
            })
        });

        const data = await response.json();
        removeTypingIndicator();

        if (data.candidates && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage(aiText, 'ai');
            saveSession(aiText, 'ai');
        } else {
            appendMessage("மன்னிக்கவும், பிழை ஏற்பட்டது.", 'ai');
        }
    } catch (err) {
        removeTypingIndicator();
        appendMessage("இணைய பிழை.", 'ai');
        console.error(err);
    }
}

// --- UI Helpers ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (window.innerWidth <= 768) {
        // Mobile behavior: toggle 'open' class and overlay
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    } else {
        // Desktop behavior: toggle 'collapsed' class
        sidebar.classList.toggle('collapsed');
    }
}

function closeSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

function changeTool() {
    // When tool changes in the middle of chat, we just update future prompt context
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    if (textarea.value === '') textarea.style.height = '24px';
}

function showTypingIndicator() {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing-indicator';
    div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

document.getElementById('user-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }

});


