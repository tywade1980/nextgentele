/**
 * AI API Routes
 * Handles all AI-related API endpoints
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// This would be injected in a real application
let aiService = null;

/**
 * Initialize route dependencies
 */
function initializeRoutes(ai) {
  aiService = ai;
}

/**
 * Initialize AI handling for a call
 * POST /api/ai/initialize/:callId
 */
router.post('/initialize/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { options } = req.body;

    const handlerConfig = await aiService.initializeCallHandling(callId, options || {});

    res.status(200).json({
      success: true,
      handlerConfig
    });

  } catch (error) {
    logger.error('Failed to initialize AI handling:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize AI handling',
      message: error.message
    });
  }
});

/**
 * Generate AI response
 * POST /api/ai/respond/:callId
 */
router.post('/respond/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input text is required'
      });
    }

    const response = await aiService.generateResponse(callId, input);

    res.status(200).json({
      success: true,
      response
    });

  } catch (error) {
    logger.error('Failed to generate AI response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      message: error.message
    });
  }
});

/**
 * Process audio stream
 * POST /api/ai/process-audio/:callId
 */
router.post('/process-audio/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const audioBuffer = req.body; // Assume raw audio buffer

    await aiService.processAudioStream(callId, audioBuffer);

    res.status(200).json({
      success: true,
      message: 'Audio processed successfully'
    });

  } catch (error) {
    logger.error('Failed to process audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process audio',
      message: error.message
    });
  }
});

/**
 * Get conversation summary
 * GET /api/ai/summary/:callId
 */
router.get('/summary/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const summary = await aiService.getConversationSummary(callId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'No conversation data found for this call'
      });
    }

    res.status(200).json({
      success: true,
      summary
    });

  } catch (error) {
    logger.error('Failed to get conversation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation summary',
      message: error.message
    });
  }
});

/**
 * Auto-answer incoming call
 * POST /api/ai/auto-answer/:callId
 */
router.post('/auto-answer/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const result = await aiService.autoAnswerCall(callId);

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Failed to auto-answer call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-answer call',
      message: error.message
    });
  }
});

/**
 * Screen incoming call
 * POST /api/ai/screen/:callId
 */
router.post('/screen/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const result = await aiService.screenIncomingCall(callId);

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Failed to screen call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to screen call',
      message: error.message
    });
  }
});

/**
 * Activate assistant mode
 * POST /api/ai/assistant/:callId
 */
router.post('/assistant/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const result = await aiService.assistantMode(callId);

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Failed to activate assistant mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate assistant mode',
      message: error.message
    });
  }
});

/**
 * Analyze text
 * POST /api/ai/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for analysis'
      });
    }

    const analysis = await aiService.analyzeText(text);

    res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('Failed to analyze text:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze text',
      message: error.message
    });
  }
});

/**
 * Cleanup AI handler
 * DELETE /api/ai/cleanup/:callId
 */
router.delete('/cleanup/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    await aiService.cleanup(callId);

    res.status(200).json({
      success: true,
      message: 'AI handler cleaned up successfully'
    });

  } catch (error) {
    logger.error('Failed to cleanup AI handler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup AI handler',
      message: error.message
    });
  }
});

module.exports = { router, initializeRoutes };