# Flash Loan AI Agent API

A FastAPI-based REST API for interacting with the Flash Loan AI Agent with session persistence and streaming capabilities.

## Features

- 🤖 **AI-Powered Flash Loan Assistant** - Powered by Google Gemini
- 💾 **Session Persistence** - MongoDB-backed conversation history
- 🚀 **Streaming Responses** - Real-time response streaming
- 🔗 **Wallet-Based Sessions** - Session management per wallet address
- 🛠️ **Flash Loan Tools** - Integrated DeFi protocol tools

## Quick Start

### 1. Start the API Server

```bash
python app.py
```

The API will be available at `http://localhost:8000`

### 2. Open the Web Client

Visit `http://localhost:8000/` in your browser for a user-friendly interface.

### 3. Test with Python Client

```bash
python test_client.py
```

## API Endpoints

### Web Client

#### `GET /` - Web Client Interface
Access the web-based chat interface for the Flash Loan AI Agent.

### API Endpoints (under `/api`)

#### `POST /api/chat` - Regular Chat
Send a message and get a complete response.

**Request:**
```json
{
  "message": "What are flash loans?",
  "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "Flash loans are uncollateralized loans...",
  "session_id": "uuid-session-id",
  "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"
}
```

#### `POST /api/chat/stream` - Streaming Chat
Send a message and get a streaming response via Server-Sent Events.

**Request:** Same as `/chat`

**Response:** Server-Sent Events stream with:
```json
{"type": "session_info", "session_id": "...", "wallet_address": "..."}
{"type": "content", "content": "Flash loans are...", "session_id": "...", "wallet_address": "..."}
{"type": "complete", "session_id": "...", "wallet_address": "..."}
```

### Session Management

#### `GET /api/sessions/{wallet_address}` - List Sessions
Get all sessions for a wallet address.

**Response:**
```json
{
  "sessions": ["session-id-1", "session-id-2"],
  "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"
}
```

#### `GET /api/sessions/{wallet_address}/{session_id}/history` - Get Session History
Get conversation history for a specific session.

**Response:**
```json
{
  "history": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ],
  "session_id": "uuid-session-id",
  "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"
}
```

#### `DELETE /api/sessions/{wallet_address}/{session_id}` - Delete Session
Clear a session from cache.

### Utility Endpoints

#### `GET /` - API Information
Get API information and available endpoints.

#### `GET /health` - Health Check
Check if the API is running.

## Usage Examples

### Python Client

```python
import requests

# Regular chat
response = requests.post("http://localhost:8000/api/chat", json={
    "message": "Explain flash loan arbitrage",
    "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"
})
data = response.json()
print(f"Response: {data['response']}")
print(f"Session ID: {data['session_id']}")

# Continue conversation
response = requests.post("http://localhost:8000/api/chat", json={
    "message": "What are the risks?",
    "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234",
    "session_id": data['session_id']  # Use same session
})
```

### JavaScript Client (Streaming)

```javascript
async function streamChat(message, walletAddress, sessionId = null) {
  const response = await fetch('http://localhost:8000/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      wallet_address: walletAddress,
      session_id: sessionId
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'content') {
          console.log(data.content); // Stream content
        }
      }
    }
  }
}
```

### cURL Examples

```bash
# Regular chat
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is a flash loan?",
    "wallet_address": "0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"
  }'

# Get sessions
curl "http://localhost:8000/api/sessions/0x742d35Cc60C0532C2cE5264FfC5C7b7EfAc7F1234"

# Health check
curl "http://localhost:8000/api/health"
```

## Environment Variables

Make sure to set the following environment variable:

```bash
export MONGO_CONNECTION_STRING="mongodb://your-mongo-connection-string"
```

## Session Management

- **Sessions are wallet-specific**: Each wallet address has its own set of sessions
- **Automatic session creation**: If no session_id is provided, a new session is created
- **Persistent storage**: All conversations are saved to MongoDB
- **Session caching**: Agents are cached to improve performance

## Flash Loan Tools Available

The AI agent has access to the following tools:
- `create_flash_loan_strategy` - Create flash loan strategies
- `execute_flash_loan` - Execute flash loan transactions
- `get_strategy_template` - Get strategy templates
- `calculate_profit_estimate` - Calculate profit estimates
- `get_gas_estimate` - Get gas estimates
- `validate_strategy_safety` - Validate strategy safety
- `get_arbitrage_opportunities` - Find arbitrage opportunities
- `monitor_liquidation_opportunities` - Monitor liquidation opportunities
- `analyze_gas_optimization` - Analyze gas optimization

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `422` - Validation Error
- `500` - Internal Server Error

Error responses include detailed error messages:
```json
{
  "detail": "Error processing chat request: <error message>"
}
```

## Development

### Running in Development Mode

```bash
# API mode with auto-reload
python app.py

# Or using uvicorn directly
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Testing

```bash
# Run the test client
python test_client.py

# Open web client
Visit http://localhost:8000/
```

## Production Deployment

For production deployment:

1. Set proper CORS origins in `app.py`
2. Use a proper MongoDB connection string
3. Consider using a reverse proxy (nginx)
4. Use a production ASGI server like Gunicorn with Uvicorn workers

```bash
# Example production command
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
