/**
 * AI Service - Handles AI-powered call processing and automation
 * Integrates with OpenAI and other AI services for intelligent call handling
 */

const { EventEmitter } = require('events');
const OpenAI = require('openai');
const logger = require('../utils/logger');
const { CallTranscription } = require('../models/CallTranscription');
const { AIResponse } = require('../models/AIResponse');

class AIService extends EventEmitter {
  constructor() {
    super();
    this.openai = null;
    this.activeCallHandlers = new Map();
    this.conversationContexts = new Map();
    this.speechToText = null;
    this.textToSpeech = null;
  }

  /**
   * Initialize AI services
   */
  async initialize() {
    try {
      // Initialize OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('OpenAI service initialized');
      }

      // Initialize speech services (placeholder for actual implementation)
      await this.initializeSpeechServices();
      
      logger.info('AI services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI services:', error);
      throw error;
    }
  }

  /**
   * Initialize call handling for a specific call
   * @param {string} callId - Call session ID
   * @param {Object} options - AI handling options
   */
  async initializeCallHandling(callId, options = {}) {
    try {
      const handlerConfig = {
        callId,
        mode: options.mode || 'assistant', // assistant, transcription, automation
        language: options.language || 'en-US',
        context: options.context || 'general',
        capabilities: options.capabilities || ['transcription', 'response', 'sentiment'],
        realTimeProcessing: options.realTimeProcessing || true
      };

      this.activeCallHandlers.set(callId, handlerConfig);
      this.conversationContexts.set(callId, {
        messages: [],
        sentiment: 'neutral',
        intent: null,
        entities: [],
        startTime: new Date()
      });

      this.emit('aiHandlerInitialized', { callId, config: handlerConfig });
      logger.info(`AI handler initialized for call: ${callId}`);

      return handlerConfig;
    } catch (error) {
      logger.error('Failed to initialize AI call handling:', error);
      throw error;
    }
  }

  /**
   * Handle incoming call with AI
   * @param {string} callId - Call session ID
   * @param {string} mode - AI handling mode (auto-answer, screening, assistant)
   */
  async handleIncomingCall(callId, mode = 'screening') {
    try {
      const handler = this.activeCallHandlers.get(callId);
      if (!handler) {
        throw new Error('AI handler not initialized for this call');
      }

      switch (mode) {
        case 'auto-answer':
          return await this.autoAnswerCall(callId);
        case 'screening':
          return await this.screenIncomingCall(callId);
        case 'assistant':
          return await this.assistantMode(callId);
        default:
          throw new Error(`Unsupported AI mode: ${mode}`);
      }
    } catch (error) {
      logger.error('Failed to handle incoming call with AI:', error);
      throw error;
    }
  }

  /**
   * Process audio stream for real-time transcription and AI response
   * @param {string} callId - Call session ID
   * @param {Buffer} audioBuffer - Audio data buffer
   */
  async processAudioStream(callId, audioBuffer) {
    try {
      const handler = this.activeCallHandlers.get(callId);
      if (!handler || !handler.realTimeProcessing) {
        return;
      }

      // Transcribe audio to text
      const transcription = await this.transcribeAudio(audioBuffer, handler.language);
      
      if (transcription && transcription.text) {
        // Update conversation context
        const context = this.conversationContexts.get(callId);
        context.messages.push({
          role: 'user',
          content: transcription.text,
          timestamp: new Date(),
          confidence: transcription.confidence
        });

        // Analyze sentiment and intent
        const analysis = await this.analyzeText(transcription.text);
        context.sentiment = analysis.sentiment;
        context.intent = analysis.intent;
        context.entities = analysis.entities;

        // Generate AI response if in assistant mode
        if (handler.mode === 'assistant') {
          const response = await this.generateResponse(callId, transcription.text);
          if (response) {
            await this.speakResponse(callId, response);
          }
        }

        this.emit('audioProcessed', {
          callId,
          transcription,
          analysis,
          context: context
        });
      }
    } catch (error) {
      logger.error('Failed to process audio stream:', error);
    }
  }

  /**
   * Generate AI response based on conversation context
   * @param {string} callId - Call session ID
   * @param {string} userInput - User's input text
   */
  async generateResponse(callId, userInput) {
    try {
      const context = this.conversationContexts.get(callId);
      const handler = this.activeCallHandlers.get(callId);
      
      if (!context || !handler) {
        throw new Error('Call context not found');
      }

      // Build conversation history for AI
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt(handler.context)
        },
        ...context.messages.slice(-10) // Keep last 10 messages for context
      ];

      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4',
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const aiResponse = completion.choices[0].message.content;

      // Update conversation context
      context.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });

      // Save AI response
      const responseRecord = new AIResponse({
        callId,
        input: userInput,
        response: aiResponse,
        model: process.env.AI_MODEL,
        timestamp: new Date(),
        confidence: completion.choices[0].finish_reason === 'stop' ? 0.9 : 0.7
      });

      this.emit('aiResponseGenerated', responseRecord);
      logger.debug(`AI response generated for call ${callId}: ${aiResponse}`);

      return aiResponse;
    } catch (error) {
      logger.error('Failed to generate AI response:', error);
      return null;
    }
  }

  /**
   * Auto-answer call with AI greeting
   * @param {string} callId - Call session ID
   */
  async autoAnswerCall(callId) {
    try {
      const greeting = await this.generateGreeting(callId);
      await this.speakResponse(callId, greeting);
      
      logger.info(`Auto-answered call ${callId} with AI greeting`);
      return { answered: true, greeting };
    } catch (error) {
      logger.error('Failed to auto-answer call:', error);
      throw error;
    }
  }

  /**
   * Screen incoming call using AI
   * @param {string} callId - Call session ID
   */
  async screenIncomingCall(callId) {
    try {
      const screeningMessage = "Hello, this call is being screened. Please state your name and the reason for your call.";
      await this.speakResponse(callId, screeningMessage);
      
      // Wait for response and analyze
      // This would integrate with real-time audio processing
      
      logger.info(`Screening call ${callId} with AI`);
      return { screening: true, message: screeningMessage };
    } catch (error) {
      logger.error('Failed to screen call:', error);
      throw error;
    }
  }

  /**
   * Assistant mode for ongoing call support
   * @param {string} callId - Call session ID
   */
  async assistantMode(callId) {
    try {
      const assistantMessage = "Hello, I'm your AI assistant. How can I help you today?";
      await this.speakResponse(callId, assistantMessage);
      
      logger.info(`AI assistant activated for call ${callId}`);
      return { assistant: true, message: assistantMessage };
    } catch (error) {
      logger.error('Failed to activate assistant mode:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio to text
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} language - Language code
   */
  async transcribeAudio(audioBuffer, language = 'en-US') {
    try {
      // Placeholder for actual speech-to-text implementation
      // This would integrate with services like OpenAI Whisper, Google Speech-to-Text, etc.
      
      // For now, return a mock transcription
      return {
        text: "Mock transcription of audio",
        confidence: 0.95,
        language: language,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to transcribe audio:', error);
      return null;
    }
  }

  /**
   * Convert text to speech and play in call
   * @param {string} callId - Call session ID
   * @param {string} text - Text to speak
   */
  async speakResponse(callId, text) {
    try {
      // Placeholder for text-to-speech implementation
      // This would integrate with services like OpenAI TTS, Google Text-to-Speech, etc.
      
      logger.debug(`Speaking response in call ${callId}: ${text}`);
      
      this.emit('aiSpeaking', { callId, text });
      return true;
    } catch (error) {
      logger.error('Failed to speak response:', error);
      return false;
    }
  }

  /**
   * Analyze text for sentiment and intent
   * @param {string} text - Text to analyze
   */
  async analyzeText(text) {
    try {
      // Use OpenAI for text analysis
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the following text and return JSON with sentiment (positive/negative/neutral), intent, and entities. Be concise.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      return {
        sentiment: analysis.sentiment || 'neutral',
        intent: analysis.intent || 'unknown',
        entities: analysis.entities || [],
        confidence: 0.8
      };
    } catch (error) {
      logger.error('Failed to analyze text:', error);
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        entities: [],
        confidence: 0.0
      };
    }
  }

  /**
   * Generate appropriate greeting based on context
   * @param {string} callId - Call session ID
   */
  async generateGreeting(callId) {
    const handler = this.activeCallHandlers.get(callId);
    const timeOfDay = new Date().getHours();
    
    let greeting = "Hello";
    if (timeOfDay < 12) {
      greeting = "Good morning";
    } else if (timeOfDay < 18) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    return `${greeting}, thank you for calling. How may I assist you today?`;
  }

  /**
   * Get system prompt based on context
   * @param {string} context - Context type
   */
  getSystemPrompt(context) {
    const prompts = {
      general: "You are a helpful AI assistant taking phone calls. Be polite, professional, and concise in your responses.",
      customer_service: "You are a customer service AI assistant. Help resolve customer issues efficiently and professionally.",
      sales: "You are a sales AI assistant. Help customers understand products and services while being helpful and not pushy.",
      support: "You are a technical support AI assistant. Help users troubleshoot issues with clear, step-by-step guidance."
    };

    return prompts[context] || prompts.general;
  }

  /**
   * Initialize speech-to-text and text-to-speech services
   */
  async initializeSpeechServices() {
    // Placeholder for actual speech service initialization
    // This would set up connections to speech processing services
    logger.info('Speech services initialized (placeholder)');
  }

  /**
   * Cleanup AI handler for a call
   * @param {string} callId - Call session ID
   */
  async cleanup(callId) {
    try {
      this.activeCallHandlers.delete(callId);
      this.conversationContexts.delete(callId);
      
      this.emit('aiHandlerCleanup', { callId });
      logger.info(`AI handler cleaned up for call: ${callId}`);
    } catch (error) {
      logger.error('Failed to cleanup AI handler:', error);
    }
  }

  /**
   * Get conversation summary for a call
   * @param {string} callId - Call session ID
   */
  async getConversationSummary(callId) {
    try {
      const context = this.conversationContexts.get(callId);
      if (!context || context.messages.length === 0) {
        return null;
      }

      const conversationText = context.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize this phone conversation in 2-3 sentences. Focus on key points and outcomes.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Failed to generate conversation summary:', error);
      return null;
    }
  }
}

module.exports = AIService;