# Matthew Agent Frontend

A premium ChatGPT-like web interface for the Matthew Agent RAG system.

## Running:

run this command:

`cd frontend && python -m http.server 3000`

## Features

### 🎨 **Premium UI/UX**
- **ChatGPT-level Design**: Clean, modern, professional interface
- **Smooth Animations**: Sliding inputs, typewriter effects, thinking dots
- **Theme Support**: Polished light and dark modes with perfect contrast
- **Responsive Design**: Works flawlessly on desktop, tablet, and mobile

### 💬 **Chat Experience**  
- **Real-time Streaming**: Server-Sent Events (SSE) for progressive responses
- **Markdown Support**: Rich text rendering with code blocks, lists, tables
- **Typewriter Effect**: Smooth character-by-character typing animation
- **Enhanced Thinking**: Animated dots instead of static "thinking..." text
- **Auto-expanding Input**: Smart textarea that grows with content
- **ChatGPT-style Input**: Rounded container with modern ChatGPT-like design
- **Quick Actions**: Pre-defined buttons for common Matthew Gospel questions

### 🚀 **User Experience**
- **Copy Messages**: Click to copy any agent response to clipboard
- **Keyboard Shortcuts**: Ctrl+K (new session), Ctrl+, (settings), auto-focus
- **Scroll Management**: Floating scroll-to-bottom button when needed
- **Connection Status**: Real-time green/red dot showing server connectivity
- **Settings Panel**: Configurable server URL, app name, and theme preferences

### 🔧 **Technical Excellence**
- **Vanilla JavaScript**: No heavy frameworks - pure performance
- **Smart Fallbacks**: Automatic fallback from streaming to non-streaming
- **Error Handling**: Comprehensive error management with user feedback
- **Session Management**: Automatic ADK session creation and maintenance

## Quick Start

1. **Start the Backend**:
   ```bash
   ./run.sh
   ```
   This starts the ADK API server on `http://localhost:8000`

2. **Open the Frontend**:
   Simply open `index.html` in your web browser, or serve it with any static file server:
   ```bash
   # Option 1: Direct file open
   open index.html
   
   # Option 2: Simple HTTP server
   python -m http.server 3000
   # Then visit http://localhost:3000
   ```

## Configuration

Click the **Settings** button in the header to configure:

- **Server URL**: Backend API endpoint (default: `http://localhost:8000`)
- **App Name**: ADK application name (default: `mateus_rag`)
- **Theme**: Choose between light and dark modes

Settings are automatically saved to localStorage.

## Usage

1. **Initial State**: Type your question in the centered input field
2. **Chat Mode**: After the first message, the interface transforms into a chat layout
3. **Keyboard Shortcuts**:
   - `Enter`: Send message
   - `Shift + Enter`: New line
   - `Ctrl/Cmd + K`: Start new session
   - `Ctrl/Cmd + ,`: Open settings
   - `Esc`: Close modal/settings
   - `Any letter`: Auto-focus input field
4. **Quick Actions** (always visible):
   - **Exemplo1-4**: Pre-defined questions about Matthew Gospel
   - **Auto-send**: Click any quick action to automatically send that question
   - **Always Available**: Quick actions remain visible throughout the conversation
5. **Message Actions**:
   - **Copy**: Hover over agent messages to see copy button
   - **Scroll**: Floating scroll-to-bottom button appears when scrolled up
6. **New Session**: Click "New Session" to clear chat history and restart

## Technical Details

### Architecture
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no frameworks)
- **Backend**: Google ADK API server with Gemini LLM
- **Communication**: Server-Sent Events for real-time streaming
- **Styling**: CSS custom properties for theming
- **Fonts**: Inter font family for premium typography

### API Integration
The frontend connects to the ADK backend using:
- **Session Check**: `GET /apps/{app_name}/users/{user_id}/sessions/{session_id}` - Verifies connectivity
- **Streaming Chat**: `POST /run_sse` - Server-Sent Events streaming responses
- **Fallback Chat**: `POST /run` - Non-streaming JSON responses
- **Session Management**: Automatic session creation and management

### Browser Compatibility
- Modern browsers with SSE support
- ES6+ JavaScript features
- CSS Grid and Flexbox

### Performance
- Lightweight: No external dependencies except Marked.js for markdown
- Optimized: Efficient DOM manipulation and smooth animations
- Responsive: Auto-adjusting layout for all screen sizes

## Development

The codebase is organized as:
- `index.html` - Main structure and semantic markup
- `styles.css` - Premium styling with CSS custom properties
- `script.js` - Application logic and API integration

### Key Classes
- `MatthewAgent` - Main application controller
- Theme management via CSS custom properties
- Modular component structure for maintainability

## Troubleshooting

1. **Red Connection Dot**: Check that the ADK backend is running with `./run.sh`
2. **"No root_agent found" Error**: 
   - Check browser console - the frontend automatically fixes wrong app names
   - Ensure `app_name` in settings matches your ADK agent directory (`mateus_rag`)
   - Clear browser localStorage if issues persist: `localStorage.clear()` in console
3. **CORS Errors**: Ensure the ADK server is started with `--allow_origins="*"`
4. **Session Errors**: The frontend automatically creates sessions; check browser console for errors
5. **Streaming Issues**: The interface falls back to non-streaming if SSE fails
6. **Styling Issues**: Verify that the Inter font is loading correctly
7. **Mobile Issues**: Test with browser developer tools mobile simulation

### Quick Reset
If you encounter persistent issues, try:
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### Debug Streaming Issues
If messages get stuck on "Processing your request..." or appear duplicated, check the browser console for detailed logs:

**Look for these console messages:**
- `✅ Streaming SUCCESS` - Streaming worked correctly
- `❌ Streaming FAILED` - Streaming failed, fallback should run
- `🚫 SKIPPING FALLBACK` - Fallback was correctly skipped (streaming succeeded)
- `🔄 STARTING FALLBACK` - Fallback is running (streaming failed)
- `✅ FALLBACK SUCCESS` - Fallback completed successfully
- `⏳ Partial response` - ADK sent partial/preview response
- `✅ Final response` - ADK sent complete final response
