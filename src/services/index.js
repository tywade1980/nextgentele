/**
 * AI Service initialization and factory
 */

const AIService = require('./ai');
const logger = require('../utils/logger');

let aiServiceInstance = null;

/**
 * Initialize AI services
 */
async function initAIServices() {
  try {
    if (!aiServiceInstance) {
      aiServiceInstance = new AIService();
      await aiServiceInstance.initialize();
    }
    return aiServiceInstance;
  } catch (error) {
    logger.error('Failed to initialize AI services:', error);
    throw error;
  }
}

/**
 * Get AI service instance
 */
function getAIService() {
  return aiServiceInstance;
}

module.exports = {
  initAIServices,
  getAIService,
  AIService
};