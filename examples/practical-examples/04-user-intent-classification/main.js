/**
 * ============================================================================
 * USER INTENT CLASSIFICATION - Practical Example for Front-End Developers
 * ============================================================================
 * 
 * PROBLEM:
 * Front-end developers need to understand user intent from text input to:
 * - Route requests to appropriate handlers
 * - Prioritize support tickets
 * - Personalize user experiences
 * - Trigger appropriate workflows
 * - Provide contextual help
 * 
 * Traditional approaches:
 * - Keyword matching (fragile, doesn't understand context)
 * - Server-side NLP APIs (latency, cost, privacy)
 * - Rule-based systems (hard to maintain, limited)
 * 
 * SOLUTION:
 * Use AsterMind ELM to create an intent classifier that:
 * - Understands semantic meaning, not just keywords
 * - Runs entirely client-side (privacy-first)
 * - Provides instant classification (<10ms)
 * - Can be customized for your specific intents
 * - Learns from your data
 * 
 * HOW IT WORKS:
 * 
 *     User Message
 *         |
 *         v
 *     [Text Encoder] --> Feature Vector
 *         |
 *         v
 *     [ELM Classifier] --> Intent Probabilities
 *         |
 *         v
 *     [Select Top Intent] --> Intent + Confidence
 *         |
 *         v
 *     [Trigger Actions] --> Route/Respond
 * 
 * ARCHITECTURE DIAGRAM:
 * 
 *     ┌──────────────┐
 *     │ User Message │
 *     └──────┬───────┘
 *            │
 *            v
 *     ┌──────────────┐      ┌─────────────┐
 *     │ Text Encoder │─────>│   Features  │
 *     │ (Universal)  │      │   Vector   │
 *     └──────────────┘      └──────┬──────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  ELM Classifier  │
 *                          │  (Multi-class)   │
 *                          └────────┬─────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Intent Scores  │
 *                          │  (Probabilities) │
 *                          └────────┬─────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Top Intent     │
 *                          │  + Confidence   │
 *                          └─────────────────┘
 * 
 * INTENT CATEGORIES:
 * - Purchase: User wants to buy something
 * - Support: User needs help or has a question
 * - Inquiry: User is asking for information
 * - Complaint: User is reporting a problem
 * - Compliment: User is giving positive feedback
 * 
 * You can customize these categories for your use case.
 * 
 * USAGE:
 * 1. Train classifier on labeled examples of each intent
 * 2. Classify user messages in real-time
 * 3. Route to appropriate handler based on intent
 * 4. Update training data as you get more examples
 * 
 * PERFORMANCE:
 * - Training: ~200-1000ms depending on dataset size
 * - Classification: <10ms per message
 * - Memory: ~2-5MB for typical models
 * 
 * ============================================================================
 */

// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713

const { ELM, UniversalEncoder } = window.astermind;

// ============================================================================
// INTENT CATEGORIES
// ============================================================================

const INTENTS = [
    'purchase',    // User wants to buy something
    'support',     // User needs help or has a question
    'inquiry',     // User is asking for information
    'complaint',   // User is reporting a problem
    'compliment', // User is giving positive feedback
];

// ============================================================================
// TRAINING DATA - Customize for your use case
// ============================================================================

// Purchase intent examples
const PURCHASE_EXAMPLES = [
    "I want to buy this product",
    "How can I purchase this?",
    "I'd like to order one",
    "Add to cart",
    "I want to buy",
    "Can I buy this?",
    "Purchase this item",
    "I'm interested in buying",
    "How much does it cost?",
    "I want to get this",
];

// Support intent examples
const SUPPORT_EXAMPLES = [
    "How do I reset my password?",
    "I can't log in",
    "Help me with this feature",
    "How does this work?",
    "I need help",
    "Can you help me?",
    "I'm having trouble",
    "Something isn't working",
    "How do I use this?",
    "I don't understand",
];

// Inquiry intent examples
const INQUIRY_EXAMPLES = [
    "What are your business hours?",
    "Do you ship internationally?",
    "What is your return policy?",
    "Tell me more about this",
    "I have a question",
    "Can you tell me about",
    "What is",
    "How does",
    "When does",
    "Where can I find",
];

// Complaint intent examples
const COMPLAINT_EXAMPLES = [
    "This product is broken",
    "I want a refund",
    "This doesn't work",
    "I'm not satisfied",
    "This is terrible",
    "I want to return this",
    "This is defective",
    "I'm disappointed",
    "This is not what I expected",
    "I want my money back",
];

// Compliment intent examples
const COMPLIMENT_EXAMPLES = [
    "I love your service",
    "Thank you so much",
    "This is amazing",
    "Great job",
    "Excellent work",
    "I'm very happy",
    "This is perfect",
    "You're the best",
    "I really appreciate",
    "This exceeded my expectations",
];

// ============================================================================
// CONFIGURATION
// ============================================================================

// Minimum confidence threshold for intent classification
const MIN_CONFIDENCE = 0.3;

// ============================================================================
// INITIALIZATION
// ============================================================================

let classifier = null;
let isReady = false;

/**
 * Initialize and train the intent classifier
 */
async function initializeClassifier() {
    console.log('🔧 Initializing intent classifier...');
    
    // Create text encoder for preprocessing
    const textEncoder = new UniversalEncoder({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
        maxLen: 100, // Maximum message length
        useTokenizer: true, // Use word-level tokens
        tokenizerDelimiter: /\s+/, // Split on whitespace
    });
    
    // Create ELM classifier with all intent categories
    classifier = new ELM({
        categories: INTENTS, // Multi-class classification
        hiddenUnits: 128, // Hidden layer size
        maxLen: 100,
        useTokenizer: true, // Enable text mode
        encoder: textEncoder,
        activation: 'relu',
        weightInit: 'xavier',
        ridgeLambda: 0.01, // Regularization
        metrics: {
            accuracy: 0.70, // Minimum accuracy threshold
        },
    });
    
    // Prepare training data
    // Encode texts and create one-hot labels
    const X = [];
    const Y = [];
    
    // Purchase examples
    PURCHASE_EXAMPLES.forEach(text => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        X.push(vec);
        Y.push(classifier.oneHot(INTENTS.length, INTENTS.indexOf('purchase')));
    });
    
    // Support examples
    SUPPORT_EXAMPLES.forEach(text => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        X.push(vec);
        Y.push(classifier.oneHot(INTENTS.length, INTENTS.indexOf('support')));
    });
    
    // Inquiry examples
    INQUIRY_EXAMPLES.forEach(text => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        X.push(vec);
        Y.push(classifier.oneHot(INTENTS.length, INTENTS.indexOf('inquiry')));
    });
    
    // Complaint examples
    COMPLAINT_EXAMPLES.forEach(text => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        X.push(vec);
        Y.push(classifier.oneHot(INTENTS.length, INTENTS.indexOf('complaint')));
    });
    
    // Compliment examples
    COMPLIMENT_EXAMPLES.forEach(text => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        X.push(vec);
        Y.push(classifier.oneHot(INTENTS.length, INTENTS.indexOf('compliment')));
    });
    
    console.log(`📚 Training on ${X.length} examples...`);
    console.log(`   - Purchase: ${PURCHASE_EXAMPLES.length}`);
    console.log(`   - Support: ${SUPPORT_EXAMPLES.length}`);
    console.log(`   - Inquiry: ${INQUIRY_EXAMPLES.length}`);
    console.log(`   - Complaint: ${COMPLAINT_EXAMPLES.length}`);
    console.log(`   - Compliment: ${COMPLIMENT_EXAMPLES.length}`);
    
    const startTime = performance.now();
    
    // Train the classifier
    classifier.trainFromData(X, Y);
    
    const trainTime = performance.now() - startTime;
    console.log(`✅ Training complete in ${trainTime.toFixed(2)}ms`);
    
    // Test the classifier
    testClassifier();
    
    isReady = true;
    console.log('🚀 Intent classification system ready!');
}

/**
 * Test the classifier with sample inputs
 */
function testClassifier() {
    console.log('🧪 Testing classifier...');
    
    const testCases = [
        { text: "I want to buy this", expected: 'purchase' },
        { text: "How do I reset password?", expected: 'support' },
        { text: "What are your hours?", expected: 'inquiry' },
        { text: "This is broken", expected: 'complaint' },
        { text: "I love this!", expected: 'compliment' },
    ];
    
    testCases.forEach(({ text, expected }) => {
        const result = classifyIntent(text);
        console.log(`   "${text}" -> ${result.intent} (${(result.confidence * 100).toFixed(1)}%)`);
    });
}

/**
 * Classify user intent from text
 * @param {string} text - User message text
 * @returns {Object} Classification result with intent, confidence, and all scores
 */
function classifyIntent(text) {
    if (!isReady || !text.trim()) {
        return {
            intent: 'unknown',
            confidence: 0,
            scores: {},
        };
    }
    
    // Get predictions from the classifier
    // Returns array of { label, prob } sorted by probability
    const predictions = classifier.predict(text.toLowerCase());
    
    // Get top intent (highest probability)
    const topIntent = predictions[0];
    
    // Build scores object for all intents
    const scores = {};
    predictions.forEach(pred => {
        scores[pred.label] = pred.prob;
    });
    
    // Determine confidence
    // If top score is below threshold, mark as uncertain
    const confidence = topIntent.prob >= MIN_CONFIDENCE 
        ? topIntent.prob 
        : 0;
    
    return {
        intent: topIntent.label,
        confidence: confidence,
        scores: scores,
        allPredictions: predictions, // Full prediction array
    };
}

/**
 * Get suggested actions based on intent
 * @param {string} intent - Classified intent
 * @returns {Array} Array of action objects
 */
function getIntentActions(intent) {
    const actions = {
        purchase: [
            { label: 'Show Product Page', action: 'navigate' },
            { label: 'Add to Cart', action: 'cart' },
            { label: 'Show Pricing', action: 'pricing' },
        ],
        support: [
            { label: 'Open Help Center', action: 'help' },
            { label: 'Start Live Chat', action: 'chat' },
            { label: 'Create Support Ticket', action: 'ticket' },
        ],
        inquiry: [
            { label: 'Show FAQ', action: 'faq' },
            { label: 'Contact Sales', action: 'sales' },
            { label: 'View Documentation', action: 'docs' },
        ],
        complaint: [
            { label: 'Escalate to Manager', action: 'escalate' },
            { label: 'Process Refund', action: 'refund' },
            { label: 'Create Support Case', action: 'case' },
        ],
        compliment: [
            { label: 'Save Feedback', action: 'save' },
            { label: 'Share with Team', action: 'share' },
            { label: 'Request Testimonial', action: 'testimonial' },
        ],
    };
    
    return actions[intent] || [];
}

/**
 * Render classification result to the DOM
 */
function renderResult(text, result) {
    const resultsSection = document.getElementById('resultsSection');
    
    if (!text.trim()) {
        resultsSection.innerHTML = '<div class="loading">Ready! Enter text above to classify intent...</div>';
        return;
    }
    
    const { intent, confidence, scores, allPredictions } = result;
    
    // Get intent display info
    const intentInfo = {
        purchase: { label: 'Purchase Intent', emoji: '🛒', color: '#3b82f6' },
        support: { label: 'Support Request', emoji: '🆘', color: '#f59e0b' },
        inquiry: { label: 'Information Inquiry', emoji: '❓', color: '#10b981' },
        complaint: { label: 'Complaint', emoji: '😠', color: '#ef4444' },
        compliment: { label: 'Compliment', emoji: '😊', color: '#ec4899' },
    };
    
    const info = intentInfo[intent] || { label: 'Unknown', emoji: '❓', color: '#6b7280' };
    
    // Calculate confidence percentage
    const confidencePercent = Math.round(confidence * 100);
    
    // Get suggested actions
    const actions = getIntentActions(intent);
    
    // Build HTML
    let html = `
        <div class="intent-card ${intent}">
            <div class="intent-header">
                <div>
                    <span>${info.emoji}</span>
                    <span class="intent-label">${info.label}</span>
                </div>
                <div class="intent-score">${confidencePercent}% confidence</div>
            </div>
            
            <div class="intent-actions">
                <strong>Suggested Actions:</strong><br>
                ${actions.map(action => 
                    `<button class="action-btn" onclick="handleAction('${action.action}')">${action.label}</button>`
                ).join('')}
            </div>
        </div>
        
        <div class="all-intents">
            <h3>All Intent Scores:</h3>
    `;
    
    // Add bars for all intents
    INTENTS.forEach(intentName => {
        const score = scores[intentName] || 0;
        const percent = Math.round(score * 100);
        const isTop = intentName === intent;
        
        html += `
            <div class="intent-bar">
                <div class="intent-bar-label">${intentInfo[intentName]?.label || intentName}</div>
                <div class="intent-bar-track">
                    <div class="intent-bar-fill" 
                         style="width: ${percent}%; background: ${intentInfo[intentName]?.color || '#6b7280'}; opacity: ${isTop ? 1 : 0.6};">
                    </div>
                </div>
                <div class="intent-bar-value">${percent}%</div>
            </div>
        `;
    });
    
    html += '</div>';
    
    resultsSection.innerHTML = html;
}

/**
 * Handle action button clicks
 * @param {string} action - Action identifier
 */
window.handleAction = function(action) {
    console.log(`🎯 Action triggered: ${action}`);
    alert(`Action: ${action}\n\nIn production, this would trigger the appropriate workflow.`);
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================

let classifyTimeout = null;

/**
 * Handle text input with debouncing
 */
document.getElementById('userInput').addEventListener('input', (e) => {
    const text = e.target.value;
    
    // Clear previous timeout
    if (classifyTimeout) {
        clearTimeout(classifyTimeout);
    }
    
    // Debounce: classify 300ms after user stops typing
    classifyTimeout = setTimeout(() => {
        if (!isReady) {
            document.getElementById('resultsSection').innerHTML = 
                '<div class="loading">Initializing intent classifier...</div>';
            return;
        }
        
        const result = classifyIntent(text);
        renderResult(text, result);
    }, 300);
});

/**
 * Handle example button clicks
 */
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        document.getElementById('userInput').value = text;
        
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        document.getElementById('userInput').dispatchEvent(event);
    });
});

// ============================================================================
// STARTUP
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeClassifier();
    } catch (error) {
        console.error('❌ Initialization error:', error);
        document.getElementById('resultsSection').innerHTML = 
            `<div class="intent-card complaint">
                <div class="intent-header">
                    <span>❌</span>
                    <span class="intent-label">Error</span>
                </div>
                <p>Failed to initialize: ${error.message}</p>
            </div>`;
    }
});




