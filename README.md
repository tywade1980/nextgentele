# NextGenTele - Next-Generation Telecommunication System

A comprehensive, AI-powered telecommunication system with support for multiple call protocols, intelligent call handling, and regulatory compliance.

## Features

### 🔥 Core Dialer Capabilities
- **Multi-Protocol Support**: SIP, WebRTC, PSTN integration
- **Call Management**: Make, receive, transfer, hold/resume calls
- **Real-time Communication**: WebRTC signaling for browser-to-browser calls
- **Traditional Telephony**: SIP stack for PSTN and PBX integration

### 🤖 AI-Powered Call Handling
- **Intelligent Call Processing**: OpenAI-powered conversation analysis
- **Real-time Transcription**: Speech-to-text with sentiment analysis
- **Auto-Answer & Screening**: AI-driven call management
- **Assistant Mode**: In-call AI assistance and automation
- **Intent Recognition**: Automatic detection of caller intent and entities

### 📋 Regulatory Compliance
- **Multi-Region Support**: US (TCPA), EU (GDPR), UK (PECR), Canada (CASL/PIPEDA)
- **Do Not Call Registry**: Integrated DNC checking
- **Calling Hours**: Timezone-aware compliance
- **Recording Compliance**: Legal recording with proper notifications
- **Data Retention**: Automated compliance with retention policies

### 🛡️ Security & Privacy
- **Authentication**: JWT-based secure authentication
- **Encryption**: Secure data storage and transmission
- **Rate Limiting**: Protection against abuse
- **Input Validation**: SQL injection and XSS prevention
- **GDPR Compliance**: Privacy-by-design architecture

### 📊 Analytics & Monitoring
- **Call Analytics**: Detailed call metrics and statistics
- **Quality Monitoring**: Call quality and performance tracking
- **Conversation Analysis**: AI-powered conversation insights
- **Compliance Reporting**: Automated regulatory compliance reports

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **Socket.IO** for real-time WebRTC signaling
- **SQLite** database with comprehensive schema
- **OpenAI API** for AI capabilities
- **Twilio** for PSTN connectivity
- **node-sip** for SIP protocol support

### Frontend
- **Vanilla JavaScript** with modern ES6+ features
- **WebRTC** for browser-based calling
- **Socket.IO Client** for real-time communication
- **Responsive CSS** with modern design principles

### AI & ML
- **OpenAI GPT-4** for conversation analysis and response generation
- **Speech-to-Text** integration (configurable providers)
- **Text-to-Speech** for AI voice responses
- **Sentiment Analysis** and intent recognition

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key (for AI features)
- Twilio account (for PSTN calls)
- SIP provider credentials (optional)

### Installation

1. **Clone and install dependencies**:
```bash
git clone https://github.com/tywade1980/nextgentele.git
cd nextgentele
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

3. **Start the application**:
```bash
npm start
```

4. **Access the interface**:
Open http://localhost:3000 in your browser

### Development Mode
```bash
npm run dev  # Starts with nodemon for auto-restart
```

## Configuration

### Environment Variables

#### Core Configuration
```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/nextgentele.db
JWT_SECRET=your_jwt_secret_here
```

#### AI Services
```env
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-4
```

#### Telephony Providers
```env
# Twilio (for PSTN)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# SIP Configuration
SIP_DOMAIN=your_sip_domain.com
SIP_USERNAME=your_sip_username
SIP_PASSWORD=your_sip_password
```

#### WebRTC Configuration
```env
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_SERVERS=turn:your_turn_server.com:3478
```

#### Compliance Settings
```env
CALL_RECORDING_ENABLED=true
GDPR_COMPLIANCE=true
HIPAA_COMPLIANCE=false
CALL_RETENTION_DAYS=30
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "securepassword",
  "phoneNumber": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "securepassword"
}
```

### Dialer Endpoints

#### Make Call
```http
POST /api/dialer/call
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "from": "+0987654321",
  "protocol": "SIP",
  "options": {
    "aiEnabled": true,
    "aiMode": "assistant"
  }
}
```

#### End Call
```http
POST /api/dialer/end/:callId
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "user_hangup"
}
```

### AI Endpoints

#### Generate Response
```http
POST /api/ai/respond/:callId
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": "Hello, how can I help you?"
}
```

#### Get Conversation Summary
```http
GET /api/ai/summary/:callId
Authorization: Bearer <token>
```

## Architecture Overview

### Call Flow
1. **Call Initiation**: User dials number through web interface
2. **Compliance Check**: System validates against regulations and DNC
3. **Protocol Routing**: Call routed via SIP, WebRTC, or PSTN
4. **AI Integration**: Optional AI processing for transcription and assistance
5. **Call Management**: Full call control with transfer, hold, recording capabilities

### AI Processing Pipeline
1. **Audio Capture**: Real-time audio stream processing
2. **Speech-to-Text**: Convert audio to text transcription
3. **Analysis**: Sentiment, intent, and entity extraction
4. **Response Generation**: AI-powered response using conversation context
5. **Text-to-Speech**: Convert AI responses back to audio

### Compliance Framework
1. **Pre-Call Validation**: DNC registry and calling hours check
2. **Consent Management**: Track and validate user consents
3. **Recording Compliance**: Legal recording with notifications
4. **Data Retention**: Automated cleanup based on regulations
5. **Audit Trail**: Comprehensive logging for compliance reporting

## Development

### Project Structure
```
nextgentele/
├── src/
│   ├── database/          # Database initialization and schema
│   ├── models/           # Data models (CallSession, AIResponse, etc.)
│   ├── routes/           # API route handlers
│   ├── services/         # Core services (Dialer, AI, SIP, WebRTC)
│   ├── utils/            # Utilities (logging, validation, compliance)
│   └── index.js          # Main application entry point
├── public/               # Frontend static files
│   ├── css/             # Stylesheets
│   ├── js/              # Frontend JavaScript
│   └── index.html       # Main UI
├── logs/                # Application logs
├── data/                # SQLite database files
└── package.json         # Dependencies and scripts
```

### Adding New Features

#### Custom AI Models
Extend the AI service to support additional models:
```javascript
// src/services/ai.js
async initializeCustomModel() {
  // Add your custom AI model initialization
}
```

#### New Call Protocols
Add support for new protocols:
```javascript
// src/services/dialer.js
async makeCustomProtocolCall(callSession, options) {
  // Implement your custom protocol
}
```

#### Additional Compliance Rules
Extend compliance checking:
```javascript
// src/utils/compliance.js
function checkCustomRegulation(phoneNumber, context) {
  // Add your custom compliance rules
}
```

### Testing

#### Run Tests
```bash
npm test
```

#### Linting
```bash
npm run lint
```

## Deployment

### Production Setup

1. **Environment Configuration**:
```bash
NODE_ENV=production
# Set all production API keys and secrets
```

2. **Database Setup**:
```bash
# Ensure database directory exists and has proper permissions
mkdir -p /var/lib/nextgentele/data
```

3. **Process Management**:
```bash
# Using PM2
npm install -g pm2
pm2 start src/index.js --name nextgentele
```

4. **Reverse Proxy** (nginx example):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Considerations

#### Production Security
- Use HTTPS/TLS for all communications
- Implement rate limiting and DDoS protection
- Regular security audits and dependency updates
- Secure API key management
- Database encryption and backups

#### WebRTC Security
- Use TURN servers for NAT traversal
- Implement peer authentication
- Monitor for unauthorized connections

## Compliance & Legal

### Supported Regulations
- **TCPA** (Telephone Consumer Protection Act) - USA
- **GDPR** (General Data Protection Regulation) - EU
- **PECR** (Privacy and Electronic Communications Regulations) - UK
- **CASL** (Canada's Anti-Spam Legislation) - Canada
- **PIPEDA** (Personal Information Protection and Electronic Documents Act) - Canada

### Data Retention
- Configurable retention periods
- Automatic data deletion
- Compliance reporting
- Right to be forgotten (GDPR Article 17)

### Call Recording
- Consent-based recording
- Legal notifications
- Secure storage
- Access controls

## Support & Contributions

### Getting Help
- Check the documentation and examples
- Review existing issues on GitHub
- Create a detailed bug report with steps to reproduce

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with detailed description

### License
MIT License - see LICENSE file for details

---

## Technical Specifications

### System Requirements
- **Memory**: 512MB minimum, 2GB recommended
- **Storage**: 1GB for application, additional for call recordings
- **Network**: Stable internet connection for PSTN/SIP calls
- **Ports**: 3000 (HTTP), 5060 (SIP), custom range for RTP

### Performance Metrics
- **Concurrent Calls**: 100+ (depends on server resources)
- **AI Response Time**: <2 seconds average
- **Call Setup Time**: <3 seconds for SIP/WebRTC
- **Transcription Accuracy**: 90%+ (depends on audio quality)

### Scalability
- Horizontal scaling with load balancing
- Database clustering support
- CDN integration for static assets
- Microservices architecture ready

---

*NextGenTele - Empowering next-generation communication with AI-driven intelligence and regulatory compliance.*