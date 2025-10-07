class MatthewAgent {
    constructor() {
        this.settings = {
            serverUrl: 'http://localhost:8000',
            appName: 'mateus_rag',
            theme: 'light'
        };
        
        this.isInitialState = true;
        this.isConnected = false;
        this.currentEventSource = null;
        this.messageHistory = [];
        
        // ADK session management
        this.userId = this.getOrSetUserId();
        this.sessionId = this.getOrSetSessionId();
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.clearOldSettings(); // Fix any cached wrong app names
        this.initElements();
        this.bindEvents();
        this.applyTheme();
        this.updateTitle(); // Set correct title
        this.checkConnection();
        this.setupScrollToBottom(); // Setup scroll to bottom functionality
        this.setupKeyboardShortcuts(); // Setup keyboard shortcuts
        
        // Show initial greeting
        this.showInitialGreeting();
    }
    
    getOrSetUserId() {
        let id = localStorage.getItem('adk_user_id');
        if (!id) {
            id = `u_${this.generateId()}`;
            localStorage.setItem('adk_user_id', id);
        }
        return id;
    }
    
    getOrSetSessionId() {
        let id = localStorage.getItem('adk_session_id');
        if (!id) {
            id = `s_${this.generateId()}`;
            localStorage.setItem('adk_session_id', id);
        }
        return id;
    }
    
    generateId() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    
    loadSettings() {
        const saved = localStorage.getItem('matthew-agent-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    saveSettings() {
        localStorage.setItem('matthew-agent-settings', JSON.stringify(this.settings));
    }
    
    initElements() {
        // Main elements
        this.statusDot = document.getElementById('statusDot');
        this.mainContainer = document.getElementById('mainContainer');
        this.initialState = document.getElementById('initialState');
        this.chatState = document.getElementById('chatState');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.bottomInputContainer = document.getElementById('bottomInputContainer');
        
        // Input elements
        this.messageInput = document.getElementById('messageInput');
        this.bottomMessageInput = document.getElementById('bottomMessageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.bottomSendBtn = document.getElementById('bottomSendBtn');
        
        // Header buttons
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Modal elements
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalClose = document.getElementById('modalClose');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.appNameInput = document.getElementById('appName');
        this.themeSelect = document.getElementById('theme');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveBtn = document.getElementById('saveBtn');
        
        // Loading indicator
        this.loadingIndicator = document.getElementById('loadingIndicator');
    }
    
    bindEvents() {
        // Input events
        this.messageInput.addEventListener('input', () => this.handleInputChange(this.messageInput, this.sendBtn));
        this.bottomMessageInput.addEventListener('input', () => this.handleInputChange(this.bottomMessageInput, this.bottomSendBtn));
        
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e, this.messageInput));
        this.bottomMessageInput.addEventListener('keydown', (e) => this.handleKeyDown(e, this.bottomMessageInput));
        
        // Send button events
        this.sendBtn.addEventListener('click', () => this.sendMessage(this.messageInput));
        this.bottomSendBtn.addEventListener('click', () => this.sendMessage(this.bottomMessageInput));
        
        // Quick action buttons
        this.setupQuickActions();
        
        // Header events
        this.newSessionBtn.addEventListener('click', () => this.newSession());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // Modal events
        this.modalClose.addEventListener('click', () => this.closeSettings());
        this.cancelBtn.addEventListener('click', () => this.closeSettings());
        this.saveBtn.addEventListener('click', () => this.saveSettingsAndClose());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.closeSettings();
        });
        
        // Theme change
        this.themeSelect.addEventListener('change', () => this.previewTheme());
        
        // Auto-resize textareas
        this.setupAutoResize(this.messageInput);
        this.setupAutoResize(this.bottomMessageInput);
    }
    
    setupAutoResize(textarea) {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            const maxHeight = textarea.classList.contains('chatgpt-input') ? 200 : 120;
            textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        });
    }
    
    setupQuickActions() {
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                if (text) {
                    // Set the text in bottom input and send
                    this.bottomMessageInput.value = text;
                    this.handleInputChange(this.bottomMessageInput, this.bottomSendBtn);
                    
                    // Auto send the message
                    setTimeout(() => {
                        this.sendMessage(this.bottomMessageInput);
                    }, 100);
                }
            });
        });
    }
    
    handleInputChange(input, button) {
        const hasText = input.value.trim().length > 0;
        button.disabled = !hasText;
        
        // Auto-resize with appropriate max height
        input.style.height = 'auto';
        const maxHeight = input.classList.contains('chatgpt-input') ? 200 : 120;
        input.style.height = Math.min(input.scrollHeight, maxHeight) + 'px';
    }
    
    handleKeyDown(e, input) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.value.trim()) {
                this.sendMessage(input);
            }
        }
    }
    
    async sendMessage(input) {
        const message = input.value.trim();
        if (!message) return;
        
        // Clear and reset input
        input.value = '';
        input.style.height = 'auto';
        this.handleInputChange(input, input === this.messageInput ? this.sendBtn : this.bottomSendBtn);
        
        // Transition to chat state if needed
        if (this.isInitialState) {
            this.transitionToChat();
        }
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Send to agent
        await this.sendToAgent(message);
    }
    
    transitionToChat() {
        this.isInitialState = false;
        
        // Hide initial state
        this.initialState.classList.add('hidden');
        
        // Show chat state
        this.chatState.classList.remove('hidden');
        this.bottomInputContainer.classList.remove('hidden');
        
        // Keep quick actions visible (removed auto-hide logic)
        
        // Focus bottom input
        setTimeout(() => {
            this.bottomMessageInput.focus();
        }, 300);
    }
    
    addMessage(content, type, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (type === 'agent' && !isStreaming) {
            // Render markdown for agent messages
            contentDiv.innerHTML = marked.parse(content, {
                mangle: false,
                headerIds: false
            });
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Add copy button for agent messages
        if (type === 'agent') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.title = 'Copy message';
            copyBtn.addEventListener('click', () => this.copyMessage(contentDiv, copyBtn));
            messageDiv.appendChild(copyBtn);
        }
        
        this.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        return contentDiv;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 10);
    }
    
    async sendToAgent(message) {
        // Show enhanced thinking animation
        const thinkingContent = `<div class="thinking-animation">
            <span>Thinking</span>
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        </div>`;
        
        const thinkingDiv = this.addMessage('', 'agent');
        thinkingDiv.innerHTML = thinkingContent;
        let responseHandled = false; // Track if we've already handled the response
        
        // Update thinking message after delay
        setTimeout(() => {
            if (thinkingDiv && thinkingDiv.innerHTML === thinkingContent) {
                thinkingDiv.innerHTML = `<div class="thinking-animation">
                    <span>Processing your request</span>
                    <div class="thinking-dots">
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                    </div>
                </div>`;
            }
        }, 1500);
        
        try {
            // Ensure session exists first
            console.log('Ensuring session exists...');
            await this.ensureSession();
            
            // Small delay to ensure session is fully initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Prepare ADK request body
            const body = {
                app_name: this.settings.appName,
                user_id: this.userId,
                session_id: this.sessionId,
                new_message: { role: 'user', parts: [{ text: message }] },
                streaming: true
            };
            
            console.log('Sending to ADK:', { 
                app_name: this.settings.appName, 
                user_id: this.userId, 
                session_id: this.sessionId,
                message_length: message.length
            });
            
            // Try streaming first
            try {
                const response = await fetch(`${this.settings.serverUrl}/run_sse`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Accept': 'text/event-stream' 
                    },
                    body: JSON.stringify(body)
                });
                
                if (response.ok) {
                    // Set up timeout for streaming response
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Streaming timeout')), 30000); // 30 second timeout
                    });
                    
                    try {
                        const streamResult = await Promise.race([
                            this.handleStreamingResponse(response, thinkingDiv),
                            timeoutPromise
                        ]);
                        
                        // Check if streaming actually returned content
                        if (streamResult !== false) {
                            responseHandled = true;
                            this.updateConnectionStatus(true);
                            return; // SUCCESS - don't run fallback
                        } else {
                            console.log('Streaming completed but no content, trying fallback');
                            // Continue to fallback, but thinking div might already be removed
                        }
                    } catch (timeoutError) {
                        console.log('Streaming timeout, trying fallback:', timeoutError);
                        // Continue to fallback, thinking div should still exist
                    }
                } else {
                    console.log('Streaming response not OK:', response.status, response.statusText);
                }
            } catch (streamError) {
                console.log('Streaming failed, trying fallback:', streamError);
            }
            
            // Fallback to non-streaming - only if we haven't already handled the response
            if (responseHandled) {
                console.log('🚫 SKIPPING FALLBACK - Response already handled by streaming');
                return;
            }
            
            if (!thinkingDiv || !thinkingDiv.parentElement) {
                console.log('🚫 SKIPPING FALLBACK - Thinking div already removed (streaming succeeded)');
                this.updateConnectionStatus(true);
                return;
            }
            
            console.log('🔄 STARTING FALLBACK - Trying non-streaming...');
            const fallbackBody = { ...body, streaming: false };
            const fallbackResponse = await fetch(`${this.settings.serverUrl}/run`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json' 
                },
                body: JSON.stringify(fallbackBody)
            });
            
            if (fallbackResponse.ok) {
                const result = await fallbackResponse.json();
                console.log('Fallback response:', result);
                
                // Remove thinking message
                if (thinkingDiv && thinkingDiv.parentElement) {
                    thinkingDiv.parentElement.remove();
                }
                
                // Extract text from ADK response
                const text = this.extractChunkText(result);
                console.log('Extracted fallback text:', text);
                
                if (text) {
                    // Add response with typewriter effect
                    const responseDiv = this.addMessage('', 'agent', true);
                    this.startTypewriter(responseDiv, text);
                    responseHandled = true;
                    console.log('✅ FALLBACK SUCCESS - Response added to UI');
                } else {
                    // Show raw response if we can't extract text
                    this.addMessage('Response received but could not extract text. Raw response logged to console.', 'agent');
                    console.log('Full response structure:', JSON.stringify(result, null, 2));
                    responseHandled = true;
                    console.log('⚠️ FALLBACK PARTIAL - Could not extract text');
                }
                
                this.updateConnectionStatus(true);
            } else {
                const errorText = await fallbackResponse.text();
                console.error('Fallback request failed:', fallbackResponse.status, errorText);
                throw new Error(`HTTP ${fallbackResponse.status}: ${errorText}`);
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            
            // Only show error if we haven't already handled a response
            if (!responseHandled) {
                // Remove thinking message
                if (thinkingDiv && thinkingDiv.parentElement) {
                    thinkingDiv.parentElement.remove();
                }
                
                this.addMessage(`Unable to connect to the server: ${error.message}. Please check your connection and try again.`, 'agent');
                this.updateConnectionStatus(false);
            }
        }
    }
    
    async ensureSession() {
        const sessionUrl = `${this.settings.serverUrl}/apps/${encodeURIComponent(this.settings.appName)}/users/${encodeURIComponent(this.userId)}/sessions/${encodeURIComponent(this.sessionId)}`;
        
        // Check if session exists
        try {
            const response = await fetch(sessionUrl, { method: 'GET' });
            if (response.ok) return;
        } catch (error) {
            console.log('Session check failed:', error);
        }
        
        // Create session
        const createUrl = `${this.settings.serverUrl}/apps/${encodeURIComponent(this.settings.appName)}/users/${encodeURIComponent(this.userId)}/sessions`;
        
        try {
            const response = await fetch(createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId, state: {} })
            });
            
            if (response.ok) return;
            
            // Try alternative creation method
            const altUrl = `${createUrl}/${encodeURIComponent(this.sessionId)}`;
            const altResponse = await fetch(altUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ state: {} })
            });
            
            if (altResponse.ok) return;
            
            // Generate new session ID as fallback
            const fallbackResponse = await fetch(createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ state: {} })
            });
            
            if (fallbackResponse.ok) {
                const result = await fallbackResponse.json();
                const newId = (result && (result.id || result.session_id)) || `s_${this.generateId()}`;
                this.sessionId = newId;
                localStorage.setItem('adk_session_id', newId);
                return;
            }
            
        } catch (error) {
            console.error('Session creation failed:', error);
        }
        
        throw new Error('Failed to create session');
    }
    
    async handleStreamingResponse(response, thinkingDiv) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let responseContent = '';
        let responseDiv = null;
        let isFirstChunk = true;
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete SSE events
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        
                        if (data === '[DONE]') {
                            console.log('Stream completed');
                            break;
                        }
                        
                        if (data) {
                            try {
                                const event = JSON.parse(data);
                                console.log('SSE Event:', event);
                                
                                // Extract text from any ADK response format
                                const text = this.extractChunkText(event);
                                console.log('SSE Event partial flag:', event.partial);
                                console.log('Extracted streaming text:', text);
                                
                                if (text) {
                                    if (isFirstChunk) {
                                        // Remove thinking message and start response
                                        if (thinkingDiv && thinkingDiv.parentElement) {
                                            thinkingDiv.parentElement.remove();
                                        }
                                        responseDiv = this.addMessage('', 'agent', true);
                                        isFirstChunk = false;
                                        console.log('Started streaming response');
                                    }
                                    
                                    // ADK sends complete responses, not incremental chunks
                                    // Only use final response (when partial is not true)
                                    if (event.partial === true) {
                                        console.log('⏳ Partial response - showing preview');
                                        // Show partial response as preview
                                        responseContent = text;
                                    } else {
                                        console.log('✅ Final response - updating content');
                                        // Final complete response
                                        responseContent = text;
                                    }
                                    
                                    // Update display with current content
                                    if (responseDiv) {
                                        responseDiv.textContent = responseContent;
                                        this.scrollToBottom();
                                    }
                                }
                            } catch (parseError) {
                                console.log('Failed to parse SSE data:', data, parseError);
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        // Final render and result
        if (responseDiv && responseContent) {
            // Final markdown rendering with disabled deprecated features
            responseDiv.innerHTML = marked.parse(responseContent, {
                mangle: false,
                headerIds: false
            });
            this.scrollToBottom();
            console.log('✅ Streaming SUCCESS - Final response length:', responseContent.length);
            return true; // Indicate success
        } else if (isFirstChunk) {
            // No streaming content received, let the fallback handle it
            console.log('❌ Streaming FAILED - No content received, will try fallback');
            // Don't remove thinking div here, let it fall through to fallback
            return false; // Indicate no content received
        }
        
        console.log('✅ Streaming PARTIAL SUCCESS - Some content received');
        return true; // Default success if we had some content
    }
    
    parseSSE(raw) {
        const text = String(raw).replace(/\r\n/g, '\n');
        const lines = text.split('\n');
        const events = [];
        
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const payload = line.slice(5).trim();
                if (payload && payload !== '[DONE]') {
                    try {
                        events.push(JSON.parse(payload));
                    } catch (error) {
                        console.log('Failed to parse SSE data:', payload);
                    }
                }
            }
        }
        
        return events;
    }
    
    extractChunkText(obj) {
        if (!obj) return '';
        
        // Handle direct text
        if (typeof obj === 'string') return obj;
        if (obj.text) return obj.text;
        if (obj.content && typeof obj.content === 'string') return obj.content;
        
        // Handle ADK response array format (top level is array)
        if (Array.isArray(obj)) {
            return obj.map(item => this.extractChunkText(item)).join('');
        }
        
        // Handle ADK-specific formats
        if (obj.delta && obj.delta.text) return obj.delta.text;
        if (obj.message && obj.message.text) return obj.message.text;
        if (obj.chunk && obj.chunk.text) return obj.chunk.text;
        
        // Handle content.parts structure (ADK format)
        if (obj.content && obj.content.parts && Array.isArray(obj.content.parts)) {
            return obj.content.parts.map(part => {
                if (typeof part === 'string') return part;
                if (part.text) return part.text;
                if (part.content) return part.content;
                return '';
            }).filter(text => text).join('');
        }
        
        // Handle parts array (Gemini format)
        if (obj.parts && Array.isArray(obj.parts)) {
            return obj.parts.map(part => {
                if (typeof part === 'string') return part;
                if (part.text) return part.text;
                if (part.content) return part.content;
                return '';
            }).filter(text => text).join('');
        }
        
        // Handle candidates array (Gemini format)
        if (obj.candidates && Array.isArray(obj.candidates)) {
            return obj.candidates.map(candidate => {
                if (candidate.content && candidate.content.parts) {
                    return this.extractChunkText({ parts: candidate.content.parts });
                }
                return this.extractChunkText(candidate);
            }).join('');
        }
        
        // Handle nested content
        if (obj.content && typeof obj.content === 'object') {
            return this.extractChunkText(obj.content);
        }
        
        // Handle message wrapper
        if (obj.message) {
            return this.extractChunkText(obj.message);
        }
        
        // Deep search for text in any structure
        const texts = [];
        this.collectTextsDeep(obj, texts);
        return texts.join('');
    }
    
    collectTextsDeep(node, out) {
        if (!node) return;
        
        if (typeof node === 'string') {
            out.push(node);
            return;
        }
        
        if (typeof node !== 'object') return;
        
        // Check common text fields
        if (node.text) out.push(node.text);
        if (node.content && typeof node.content === 'string') out.push(node.content);
        
        // Recurse into arrays and objects
        for (const key in node) {
            if (node.hasOwnProperty(key) && key !== 'text' && key !== 'content') {
                const value = node[key];
                if (Array.isArray(value)) {
                    value.forEach(item => this.collectTextsDeep(item, out));
                } else if (typeof value === 'object') {
                    this.collectTextsDeep(value, out);
                }
            }
        }
    }
    
    startTypewriter(element, content) {
        let i = 0;
        const speed = 30; // Typing speed in ms
        
        const typeWriter = () => {
            if (i < content.length) {
                element.textContent = content.substring(0, i + 1);
                i++;
                setTimeout(typeWriter, speed);
                this.scrollToBottom();
            } else {
                // Finished typing, render as markdown
                element.innerHTML = marked.parse(content, {
                    mangle: false,
                    headerIds: false
                });
                this.scrollToBottom();
            }
        };
        
        typeWriter();
    }
    
    newSession() {
        // Clear messages
        this.messagesContainer.innerHTML = '';
        this.messageHistory = [];
        
        // Close any active connection
        if (this.currentEventSource) {
            this.currentEventSource.close();
            this.currentEventSource = null;
        }
        
        // Generate new session ID
        this.sessionId = `s_${this.generateId()}`;
        localStorage.setItem('adk_session_id', this.sessionId);
        
        // Reset to initial state
        this.isInitialState = true;
        this.chatState.classList.add('hidden');
        this.bottomInputContainer.classList.add('hidden');
        this.initialState.classList.remove('hidden');
        
        // Ensure quick actions are visible (they should be permanent now)
        const quickActions = document.getElementById('quickActions');
        if (quickActions) {
            quickActions.style.display = 'grid';
        }
        
        // Clear inputs
        this.messageInput.value = '';
        this.bottomMessageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.bottomMessageInput.style.height = 'auto';
        
        // Update button states
        this.sendBtn.disabled = true;
        this.bottomSendBtn.disabled = true;
        
        // Focus initial input
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
        
        // Show greeting
        this.showInitialGreeting();
        
        // Check connection with new session
        this.checkConnection();
    }
    
    showInitialGreeting() {
        // This is handled by CSS, just ensure we're in the right state
        document.querySelector('.welcome-title').textContent = 'Hello, how can I help?';
    }
    
    openSettings() {
        // Populate current settings
        this.serverUrlInput.value = this.settings.serverUrl;
        this.appNameInput.value = this.settings.appName;
        this.themeSelect.value = this.settings.theme;
        
        this.modalOverlay.classList.remove('hidden');
        setTimeout(() => this.serverUrlInput.focus(), 100);
    }
    
    closeSettings() {
        this.modalOverlay.classList.add('hidden');
        // Reset theme if it was being previewed
        this.applyTheme();
    }
    
    saveSettingsAndClose() {
        // Validate URL
        const url = this.serverUrlInput.value.trim();
        if (url && !this.isValidUrl(url)) {
            alert('Please enter a valid URL');
            this.serverUrlInput.focus();
            return;
        }
        
        // Save settings
        this.settings.serverUrl = url || 'http://localhost:8000';
        this.settings.appName = this.appNameInput.value.trim() || 'mateus_rag';
        this.settings.theme = this.themeSelect.value;
        
        this.saveSettings();
        this.applyTheme();
        this.updateTitle();
        this.closeSettings();
        
        // Check connection with new URL
        this.checkConnection();
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    previewTheme() {
        const theme = this.themeSelect.value;
        document.body.className = `theme-${theme}`;
    }
    
    applyTheme() {
        document.body.className = `theme-${this.settings.theme}`;
    }
    
    updateTitle() {
        document.title = this.settings.appName;
    }
    
    // Clear old settings that might have wrong app name
    clearOldSettings() {
        const saved = localStorage.getItem('matthew-agent-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.appName === 'Matthew Agent') {
                settings.appName = 'mateus_rag';
                localStorage.setItem('matthew-agent-settings', JSON.stringify(settings));
                this.settings.appName = 'mateus_rag';
                
                // Also reset session IDs to force fresh start
                this.sessionId = `s_${this.generateId()}`;
                localStorage.setItem('adk_session_id', this.sessionId);
                
                console.log('Updated app name from "Matthew Agent" to "mateus_rag"');
            }
        }
    }
    
    async checkConnection() {
        try {
            // Check ADK session endpoint
            const sessionUrl = `${this.settings.serverUrl}/apps/${encodeURIComponent(this.settings.appName)}/users/${encodeURIComponent(this.userId)}/sessions/${encodeURIComponent(this.sessionId)}`;
            const response = await fetch(sessionUrl, {
                method: 'GET'
            });
            
            this.updateConnectionStatus(response.ok);
        } catch (error) {
            console.log('Connection check failed:', error);
            this.updateConnectionStatus(false);
        }
    }
    
    updateConnectionStatus(isConnected) {
        this.isConnected = isConnected;
        
        if (isConnected) {
            this.statusDot.className = 'status-dot status-connected';
        } else {
            this.statusDot.className = 'status-dot status-disconnected';
        }
    }
    
    // Copy message functionality
    async copyMessage(contentDiv, copyBtn) {
        try {
            const text = contentDiv.textContent || contentDiv.innerText;
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy message:', error);
            // Fallback for older browsers
            this.fallbackCopy(contentDiv.textContent || contentDiv.innerText);
        }
    }
    
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
    
    // Setup scroll to bottom functionality
    setupScrollToBottom() {
        // Create scroll to bottom button
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-bottom';
        scrollBtn.innerHTML = '↓';
        scrollBtn.title = 'Scroll to bottom';
        scrollBtn.addEventListener('click', () => {
            this.messagesContainer.scrollTo({
                top: this.messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
        document.body.appendChild(scrollBtn);
        this.scrollToBottomBtn = scrollBtn;
        
        // Show/hide based on scroll position
        this.messagesContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
            
            if (isNearBottom) {
                scrollBtn.classList.remove('visible');
            } else {
                scrollBtn.classList.add('visible');
            }
        });
    }
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K - New session
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.newSession();
            }
            
            // Ctrl/Cmd + , - Open settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
            
            // Escape - Close modal if open
            if (e.key === 'Escape') {
                if (!this.modalOverlay.classList.contains('hidden')) {
                    this.closeSettings();
                }
            }
            
            // Focus input when typing (if not in input already)
            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    if (this.isInitialState) {
                        this.messageInput.focus();
                    } else {
                        this.bottomMessageInput.focus();
                    }
                }
            }
        });
    }
    
    // Utility method for creating elements
    createElement(tag, className, content) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.textContent = content;
        return element;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.matthewAgent = new MatthewAgent();
    
    // Check connection periodically
    setInterval(() => {
        window.matthewAgent.checkConnection();
    }, 30000); // Every 30 seconds
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Check connection when page becomes visible
        window.matthewAgent.checkConnection();
    }
});

// Handle window focus
window.addEventListener('focus', () => {
    window.matthewAgent.checkConnection();
});

// Graceful cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.matthewAgent && window.matthewAgent.currentEventSource) {
        window.matthewAgent.currentEventSource.close();
    }
});
