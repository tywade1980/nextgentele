/**
 * NextGenTele - Next-generation telecommunication system
 * Main entry point for the application
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const logger = require('./utils/logger');
const { initDatabase } = require('./database/init');
const dialerRoutes = require('./routes/dialer');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const callRoutes = require('./routes/calls');
const { setupWebRTCSignaling } = require('./services/webrtc');
const { initSIPStack } = require('./services/sip');
const { initAIServices } = require('./services/index');
const DialerService = require('./services/dialer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize services
let dialerService = null;
let aiService = null;
let webrtcService = null;

// Routes will be initialized after services

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize services
async function initializeApp() {
  try {
    logger.info('Initializing NextGenTele application...');
    
    // Initialize database
    await initDatabase();
    logger.info('Database initialized');
    
    // Initialize SIP stack
    const sipService = await initSIPStack();
    logger.info('SIP stack initialized');
    
    // Initialize AI services
    aiService = await initAIServices();
    logger.info('AI services initialized');
    
    // Initialize dialer service
    dialerService = new DialerService();
    await dialerService.initialize(sipService, aiService);
    logger.info('Dialer service initialized');
    
    // Initialize WebRTC signaling
    webrtcService = setupWebRTCSignaling(io);
    logger.info('WebRTC signaling initialized');
    
    // Setup routes with service dependencies
    const { router: dialerRouter, initializeRoutes: initDialerRoutes } = dialerRoutes;
    const { router: aiRouter, initializeRoutes: initAIRoutes } = aiRoutes;
    const { router: authRouter } = authRoutes;
    const callRouter = callRoutes;
    
    initDialerRoutes(dialerService, aiService);
    initAIRoutes(aiService);
    
    app.use('/api/dialer', dialerRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/calls', callRouter);
    
    logger.info('API routes initialized');
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`NextGenTele server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info('All services initialized successfully');
    });
    
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Initialize the application
initializeApp();