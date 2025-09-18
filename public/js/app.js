/**
 * NextGenTele Frontend Application
 * Handles UI interactions and WebRTC/API communications
 */

class NextGenTeleApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.authToken = null;
        this.currentCall = null;
        this.activeCalls = [];
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        // Initialize Socket.IO connection
        this.socket = io();
        
        // Setup event listeners
        this.setupEventListeners();
        this.setupSocketListeners();
        
        // Check for existing authentication
        this.checkAuthToken();
        
        // Load initial data
        this.loadCallHistory();
    }

    setupEventListeners() {
        // Auth tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchAuthTab('register'));
        
        // Auth form submissions
        document.getElementById('loginFormData').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerFormData').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Dialer pad
        document.querySelectorAll('.pad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDialPad(e));
        });
        
        // Call controls
        document.getElementById('callBtn').addEventListener('click', () => this.makeCall());
        document.getElementById('hangupBtn').addEventListener('click', () => this.hangupCall());
        document.getElementById('holdBtn').addEventListener('click', () => this.holdCall());
        document.getElementById('muteBtn').addEventListener('click', () => this.muteCall());
        
        // AI controls
        document.getElementById('aiEnabled').addEventListener('change', (e) => this.toggleAI(e));
        document.getElementById('aiMode').addEventListener('change', (e) => this.changeAIMode(e));
        
        // Header buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthSection());
        document.getElementById('registerBtn').addEventListener('click', () => this.showAuthSection('register'));
    }

    setupSocketListeners() {
        // WebRTC signaling events
        this.socket.on('incoming-call', (data) => this.handleIncomingCall(data));
        this.socket.on('call-answered', (data) => this.handleCallAnswered(data));
        this.socket.on('call-ended', (data) => this.handleCallEnded(data));
        this.socket.on('call-rejected', (data) => this.handleCallRejected(data));
        this.socket.on('ice-candidate', (data) => this.handleIceCandidate(data));
        
        // AI events
        this.socket.on('aiSpeaking', (data) => this.handleAISpeaking(data));
        this.socket.on('audioProcessed', (data) => this.handleAudioProcessed(data));
        
        // Connection events
        this.socket.on('connect', () => this.handleSocketConnect());
        this.socket.on('disconnect', () => this.handleSocketDisconnect());
    }

    // Authentication Methods
    async checkAuthToken() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await this.apiRequest('/api/auth/verify', 'GET', null, token);
                if (response.success) {
                    this.authToken = token;
                    this.currentUser = response.user;
                    this.isAuthenticated = true;
                    this.showDialerSection();
                    this.updateHeader();
                }
            } catch (error) {
                localStorage.removeItem('authToken');
                this.showAuthSection();
            }
        } else {
            this.showAuthSection();
        }
    }

    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await this.apiRequest('/api/auth/login', 'POST', {
                username,
                password
            });
            
            if (response.success) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', this.authToken);
                
                this.showNotification('Login successful!', 'success');
                this.showDialerSection();
                this.updateHeader();
            }
        } catch (error) {
            this.showNotification(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const phoneNumber = document.getElementById('registerPhone').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await this.apiRequest('/api/auth/register', 'POST', {
                username,
                email,
                phoneNumber,
                password
            });
            
            if (response.success) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', this.authToken);
                
                this.showNotification('Registration successful!', 'success');
                this.showDialerSection();
                this.updateHeader();
            }
        } catch (error) {
            this.showNotification(error.message || 'Registration failed', 'error');
        }
    }

    // UI Control Methods
    showAuthSection(tab = 'login') {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('dialerSection').style.display = 'none';
        this.switchAuthTab(tab);
    }

    showDialerSection() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dialerSection').style.display = 'block';
        this.loadCallHistory();
        this.updateActiveCalls();
    }

    updateHeader() {
        const nav = document.querySelector('.nav');
        if (this.isAuthenticated) {
            nav.innerHTML = `
                <span>Welcome, ${this.currentUser.username}</span>
                <button id="logoutBtn" class="btn btn-secondary">Logout</button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        } else {
            nav.innerHTML = `
                <button id="loginBtn" class="btn btn-primary">Login</button>
                <button id="registerBtn" class="btn btn-secondary">Register</button>
            `;
        }
    }

    logout() {
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('authToken');
        this.showAuthSection();
        this.updateHeader();
        this.showNotification('Logged out successfully', 'success');
    }

    // Dialer Methods
    handleDialPad(e) {
        const digit = e.target.dataset.digit;
        if (digit) {
            const dialerNumber = document.getElementById('dialerNumber');
            dialerNumber.value += digit;
        }
    }

    async makeCall() {
        const number = document.getElementById('dialerNumber').value.trim();
        const protocol = document.getElementById('protocolSelect').value;
        
        if (!number) {
            this.showNotification('Please enter a phone number', 'warning');
            return;
        }
        
        try {
            const response = await this.apiRequest('/api/dialer/call', 'POST', {
                to: number,
                from: this.currentUser.phoneNumber || '+1234567890',
                protocol: protocol,
                options: {
                    aiEnabled: document.getElementById('aiEnabled').checked,
                    aiMode: document.getElementById('aiMode').value
                }
            });
            
            if (response.success) {
                this.currentCall = response.callSession;
                this.updateCallStatus('Calling...', 'ringing');
                this.toggleCallControls(true);
                this.showNotification(`Calling ${number}`, 'success');
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to make call', 'error');
        }
    }

    async hangupCall() {
        if (!this.currentCall) return;
        
        try {
            const response = await this.apiRequest(`/api/dialer/end/${this.currentCall.id}`, 'POST', {
                reason: 'user_hangup'
            });
            
            if (response.success) {
                this.currentCall = null;
                this.updateCallStatus('Ready to dial', 'idle');
                this.toggleCallControls(false);
                this.clearDialerNumber();
                this.showNotification('Call ended', 'success');
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to end call', 'error');
        }
    }

    async holdCall() {
        if (!this.currentCall) return;
        
        try {
            const response = await this.apiRequest(`/api/dialer/hold/${this.currentCall.id}`, 'POST');
            
            if (response.success) {
                this.updateCallStatus('On Hold', 'hold');
                this.showNotification('Call on hold', 'success');
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to hold call', 'error');
        }
    }

    muteCall() {
        // Toggle mute state (this would integrate with actual audio controls)
        const muteBtn = document.getElementById('muteBtn');
        const isMuted = muteBtn.textContent.includes('Unmute');
        
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i> Mute';
            this.showNotification('Unmuted', 'success');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Unmute';
            this.showNotification('Muted', 'success');
        }
    }

    updateCallStatus(message, status) {
        const statusElement = document.getElementById('callStatus');
        const icons = {
            idle: 'fas fa-phone-slash',
            ringing: 'fas fa-phone',
            connected: 'fas fa-phone',
            hold: 'fas fa-pause'
        };
        
        statusElement.innerHTML = `
            <i class="${icons[status] || 'fas fa-phone-slash'}"></i>
            <span>${message}</span>
        `;
    }

    toggleCallControls(inCall) {
        document.getElementById('callBtn').style.display = inCall ? 'none' : 'inline-flex';
        document.getElementById('hangupBtn').style.display = inCall ? 'inline-flex' : 'none';
        document.getElementById('holdBtn').style.display = inCall ? 'inline-flex' : 'none';
        document.getElementById('muteBtn').style.display = inCall ? 'inline-flex' : 'none';
    }

    clearDialerNumber() {
        document.getElementById('dialerNumber').value = '';
    }

    // AI Methods
    toggleAI(e) {
        const enabled = e.target.checked;
        const aiStatus = document.getElementById('aiStatus');
        
        if (enabled) {
            aiStatus.textContent = 'AI Assistant enabled';
            this.showNotification('AI Assistant enabled', 'success');
        } else {
            aiStatus.textContent = 'AI Assistant disabled';
            this.showNotification('AI Assistant disabled', 'warning');
        }
    }

    changeAIMode(e) {
        const mode = e.target.value;
        const aiStatus = document.getElementById('aiStatus');
        aiStatus.textContent = `AI Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    }

    handleAISpeaking(data) {
        this.showNotification(`AI: ${data.text}`, 'success');
    }

    handleAudioProcessed(data) {
        if (data.transcription && data.transcription.text) {
            console.log('Transcription:', data.transcription.text);
        }
    }

    // Call History and Management
    async loadCallHistory() {
        if (!this.isAuthenticated) return;
        
        try {
            const response = await this.apiRequest('/api/calls/history?limit=10');
            if (response.success) {
                this.displayCallHistory(response.calls);
            }
        } catch (error) {
            console.error('Failed to load call history:', error);
        }
    }

    displayCallHistory(calls) {
        const historyList = document.getElementById('callHistoryList');
        
        if (calls.length === 0) {
            historyList.innerHTML = '<p class="no-calls">No recent calls</p>';
            return;
        }
        
        historyList.innerHTML = calls.map(call => `
            <div class="call-item">
                <div class="call-info">
                    <div class="call-number">${call.direction === 'outbound' ? call.to : call.from}</div>
                    <div class="call-time">${new Date(call.startTime).toLocaleString()}</div>
                </div>
                <div class="call-status status-${call.status}">${call.status}</div>
            </div>
        `).join('');
    }

    updateActiveCalls() {
        // This would be called periodically or on events to update active calls
        const activeCallsList = document.getElementById('activeCallsList');
        
        if (this.activeCalls.length === 0) {
            activeCallsList.innerHTML = '<p class="no-calls">No active calls</p>';
        } else {
            activeCallsList.innerHTML = this.activeCalls.map(call => `
                <div class="call-item">
                    <div class="call-info">
                        <div class="call-number">${call.number}</div>
                        <div class="call-time">${call.duration}</div>
                    </div>
                    <div class="call-status status-${call.status}">${call.status}</div>
                </div>
            `).join('');
        }
    }

    // WebRTC Event Handlers
    handleIncomingCall(data) {
        const answer = confirm(`Incoming call from ${data.callerPeer}. Answer?`);
        
        if (answer) {
            this.socket.emit('answer', {
                callId: data.callId,
                callerPeer: data.callerPeer,
                accepted: true,
                answer: {} // WebRTC answer would go here
            });
            
            this.currentCall = { id: data.callId, number: data.callerPeer };
            this.updateCallStatus('Connected', 'connected');
            this.toggleCallControls(true);
        } else {
            this.socket.emit('answer', {
                callId: data.callId,
                callerPeer: data.callerPeer,
                accepted: false
            });
        }
    }

    handleCallAnswered(data) {
        this.updateCallStatus('Connected', 'connected');
        this.showNotification('Call connected', 'success');
    }

    handleCallEnded(data) {
        this.currentCall = null;
        this.updateCallStatus('Ready to dial', 'idle');
        this.toggleCallControls(false);
        this.clearDialerNumber();
        this.showNotification('Call ended', 'warning');
    }

    handleCallRejected(data) {
        this.currentCall = null;
        this.updateCallStatus('Ready to dial', 'idle');
        this.toggleCallControls(false);
        this.showNotification('Call rejected', 'warning');
    }

    handleIceCandidate(data) {
        // Handle WebRTC ICE candidate
        console.log('ICE candidate received:', data);
    }

    handleSocketConnect() {
        console.log('Connected to server');
        if (this.isAuthenticated) {
            this.socket.emit('register', {
                peerId: this.currentUser.username,
                capabilities: { audio: true, video: false }
            });
        }
    }

    handleSocketDisconnect() {
        console.log('Disconnected from server');
        this.showNotification('Connection lost', 'error');
    }

    // Utility Methods
    async apiRequest(url, method = 'GET', data = null, token = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (token || this.authToken) {
            options.headers['Authorization'] = `Bearer ${token || this.authToken}`;
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Request failed');
        }
        
        return result;
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nextGenTeleApp = new NextGenTeleApp();
});