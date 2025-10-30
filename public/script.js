class ProfessionalChatbot {
    constructor() {
        this.currentChatId = this.generateChatId();
        this.chatHistory = this.loadChatHistory();
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.renderChatHistory();
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('chatHistory');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.charCount = document.querySelector('.char-count');
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.userInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResize();
        });

        this.newChatBtn.addEventListener('click', () => this.startNewChat());

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt');
                this.userInput.value = prompt;
                this.sendMessage();
            });
        });
    }

    updateCharCount() {
        const count = this.userInput.value.length;
        this.charCount.textContent = `${count}/1000`;
        
        if (count > 900) {
            this.charCount.style.color = 'var(--error-color)';
        } else {
            this.charCount.style.color = 'var(--text-secondary)';
        }
    }

    autoResize() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message || this.isProcessing) return;

        this.isProcessing = true;
        this.showLoading(true);

        // Add user message to UI
        this.addMessageToUI(message, 'user');
        this.userInput.value = '';
        this.updateCharCount();
        this.autoResize();
        this.sendButton.disabled = true;

        try {
            const response = await this.sendToBackend(message);
            this.addMessageToUI(response, 'ai');
            this.saveToChatHistory(message, response);
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToUI(
                'Sorry, I encountered an error. Please try again later.', 
                'ai'
            );
        }

        this.isProcessing = false;
        this.showLoading(false);
        this.sendButton.disabled = false;
        this.userInput.focus();
    }

    async sendToBackend(userMessage) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                chatId: this.currentChatId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Network error');
        }

        const data = await response.json();
        return data.response;
    }

    addMessageToUI(content, sender) {
        // Remove welcome message if it's the first message
        if (document.querySelector('.welcome-message')) {
            document.querySelector('.welcome-message').remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const time = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${this.formatMessage(content)}
            </div>
            <div class="message-time">${time}</div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert line breaks to <br> tags
        return content.replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    startNewChat() {
        this.currentChatId = this.generateChatId();
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>Hello! I'm your AI Assistant</h2>
                <p>How can I help you today? Feel free to ask me anything!</p>
                <div class="suggestions">
                    <button class="suggestion-btn" data-prompt="What can you help me with?">
                        What can you help me with?
                    </button>
                    <button class="suggestion-btn" data-prompt="Tell me about AI technology">
                        Tell me about AI technology
                    </button>
                    <button class="suggestion-btn" data-prompt="How does this chatbot work?">
                        How does this work?
                    </button>
                </div>
            </div>
        `;

        // Reattach event listeners to new suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt');
                this.userInput.value = prompt;
                this.sendMessage();
            });
        });

        this.renderChatHistory();
    }

    saveToChatHistory(userMessage, aiResponse) {
        const chats = this.getChats();
        const currentChat = chats.find(chat => chat.id === this.currentChatId) || {
            id: this.currentChatId,
            title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
            messages: [],
            timestamp: new Date().toISOString()
        };

        currentChat.messages.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: aiResponse }
        );

        // Update or add the chat
        const index = chats.findIndex(chat => chat.id === this.currentChatId);
        if (index > -1) {
            chats[index] = currentChat;
        } else {
            chats.unshift(currentChat);
        }

        // Keep only last 10 chats
        const limitedChats = chats.slice(0, 10);
        localStorage.setItem('chatHistory', JSON.stringify(limitedChats));
        this.renderChatHistory();
    }

    getChats() {
        return JSON.parse(localStorage.getItem('chatHistory') || '[]');
    }

    loadChatHistory() {
        return this.getChats();
    }

    renderChatHistory() {
        const chats = this.getChats();
        this.chatHistory.innerHTML = '';

        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = `chat-history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatElement.textContent = chat.title;
            chatElement.addEventListener('click', () => this.loadChat(chat.id));
            this.chatHistory.appendChild(chatElement);
        });
    }

    loadChat(chatId) {
        const chats = this.getChats();
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        this.chatMessages.innerHTML = '';

        chat.messages.forEach(msg => {
            this.addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'ai');
        });

        this.renderChatHistory();
        this.scrollToBottom();
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ProfessionalChatbot();
});