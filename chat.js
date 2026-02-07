// chat.js - Client-side Chat Logic
class AiraChatbot {
    constructor() {
        this.chatbot = document.getElementById('aira-chatbot');
        this.input = document.getElementById('aira-input');
        this.sendBtn = document.getElementById('aira-send');
        this.messagesContainer = document.querySelector('.aira-messages');
        this.openBtn = document.querySelector('.aira-open-btn');
        this.conversationId = null;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadConversationHistory();
    }
    
    setupEventListeners() {
        // Send button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key press
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Input auto-grow for multiline
        this.input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.chatbot.contains(e.target) && 
                !this.openBtn.contains(e.target) && 
                this.isChatOpen()) {
                this.closeChat();
            }
        });
        
        // Escape key to close chat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isChatOpen()) {
                this.closeChat();
            }
        });
    }
    
    isChatOpen() {
        return this.chatbot.classList.contains('open');
    }
    
    toggleChat() {
        if (this.isChatOpen()) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        this.chatbot.classList.add('open');
        this.openBtn.style.display = 'none';
        this.input.focus();
        
        // Add animation
        this.chatbot.style.animation = 'slideInUp 0.3s ease-out';
        
        // Notify analytics if needed
        this.trackEvent('chat_opened');
    }
    
    closeChat() {
        this.chatbot.classList.remove('open');
        this.openBtn.style.display = 'flex';
        this.input.blur();
        
        // Notify analytics if needed
        this.trackEvent('chat_closed');
    }
    
    async sendMessage() {
        const message = this.input.value.trim();
        
        if (!message) {
            this.showNotification('Please type a message', 'warning');
            return;
        }
        
        if (this.isLoading) {
            this.showNotification('Please wait for the current response', 'warning');
            return;
        }
        
        // Add user message to UI
        this.addMessage(message, 'user');
        this.input.value = '';
        this.input.style.height = 'auto';
        
        // Show thinking indicator
        const thinkingId = this.showThinkingIndicator();
        
        // Disable input and button
        this.setLoadingState(true);
        
        try {
            // Send to API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationId: this.conversationId
                }),
            });
            
            const data = await response.json();
            
            // Remove thinking indicator
            this.removeThinkingIndicator(thinkingId);
            
            if (data.success) {
                // Save conversation ID for context
                this.conversationId = data.conversationId;
                
                // Add bot response
                this.addMessage(data.reply, 'bot');
                
                // Save to local storage
                this.saveToHistory(message, data.reply);
            } else {
                this.addMessage(data.reply || "Sorry, I encountered an error. Please try again.", 'bot');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeThinkingIndicator(thinkingId);
            this.addMessage("I'm having trouble connecting. Please check your internet connection and try again.", 'bot');
        } finally {
            // Re-enable input and button
            this.setLoadingState(false);
        }
    }
    
    addMessage(text, sender) {
        const messageEl = document.createElement('div');
        messageEl.className = `aira-message ${sender}`;
        messageEl.textContent = text;
        
        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageEl.setAttribute('data-timestamp', timestamp);
        
        // Add animation
        messageEl.style.animation = 'fadeIn 0.3s ease-out';
    }
    
    showThinkingIndicator() {
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'aira-message bot thinking-indicator';
        thinkingEl.id = 'thinking-indicator';
        
        thinkingEl.innerHTML = `
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
        `;
        
        this.messagesContainer.appendChild(thinkingEl);
        this.scrollToBottom();
        
        return 'thinking-indicator';
    }
    
    removeThinkingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }
    
    setLoadingState(isLoading) {
        this.isLoading = isLoading;
        this.input.disabled = isLoading;
        this.sendBtn.disabled = isLoading;
        
        if (isLoading) {
            this.sendBtn.innerHTML = '...';
        } else {
            this.sendBtn.innerHTML = 'Send';
        }
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `aira-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'warning' ? '#fbbf24' : '#10b981'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1001;
            animation: fadeIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    saveToHistory(userMessage, botMessage) {
        try {
            const history = this.getConversationHistory();
            history.push({
                user: userMessage,
                bot: botMessage,
                timestamp: new Date().toISOString(),
                conversationId: this.conversationId
            });
            
            // Keep only last 50 messages
            if (history.length > 50) {
                history.splice(0, history.length - 50);
            }
            
            localStorage.setItem('aira_chat_history', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }
    
    loadConversationHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('aira_chat_history')) || [];
            if (history.length > 0) {
                // You can implement conversation history display here
                // For now, we just get the last conversation ID
                const lastChat = history[history.length - 1];
                this.conversationId = lastChat.conversationId;
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
    
    getConversationHistory() {
        try {
            return JSON.parse(localStorage.getItem('aira_chat_history')) || [];
        } catch (error) {
            return [];
        }
    }
    
    trackEvent(eventName, data = {}) {
        // Implement analytics tracking if needed
        // Example: Google Analytics, etc.
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
    }
    
    clearHistory() {
        localStorage.removeItem('aira_chat_history');
        this.conversationId = null;
        this.messagesContainer.innerHTML = '<div class="aira-message bot">Hi 👋 I\'m Aira, your AI assistant from Zubhai. How can I help you today?</div>';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.airaChatbot = new AiraChatbot();
});

// Expose toggle function globally
window.toggleChat = function() {
    if (window.airaChatbot) {
        window.airaChatbot.toggleChat();
    }
};

// Expose clear chat function for debugging
window.clearChatHistory = function() {
    if (window.airaChatbot) {
        if (confirm('Clear all chat history?')) {
            window.airaChatbot.clearHistory();
        }
    }
};
