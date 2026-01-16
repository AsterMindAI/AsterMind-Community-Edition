/**
 * ============================================================================
 * CONTENT MODERATION / TOXICITY DETECTION - Practical Example
 * ============================================================================
 * 
 * PROBLEM:
 * Front-end developers need to filter inappropriate content in user-generated
 * content (comments, posts, messages) without:
 * - Sending sensitive data to external APIs (privacy concerns)
 * - Paying per-request fees for moderation services
 * - Network latency affecting user experience
 * - Violating user privacy by sharing content with third parties
 * 
 * SOLUTION:
 * Use AsterMind ELM to create an on-device toxicity classifier that:
 * - Runs entirely in the browser (zero data leaves the device)
 * - Provides instant results (<10ms per check)
 * - Can be customized for your specific use case
 * - Works offline
 * - No API costs or rate limits
 * 
 * HOW IT WORKS:
 * 
 *     User Content
 *         |
 *         v
 *     [Text Encoder] --> Feature Vector
 *         |
 *         v
 *     [ELM Classifier] --> Toxicity Score (0-1)
 *         |
 *         v
 *     [Threshold Check] --> Safe / Warning / Unsafe
 *         |
 *         v
 *     Display Result
 * 
 * ARCHITECTURE DIAGRAM:
 * 
 *     ┌──────────────┐
 *     │  User Input  │
 *     └──────┬───────┘
 *            │
 *            v
 *     ┌──────────────┐      ┌─────────────┐
 *     │ Text Encoder │─────>│   Features  │
 *     │ (Universal)  │      │   Vector    │
 *     └──────────────┘      └──────┬──────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  ELM Classifier  │
 *                          │  (Trained)       │
 *                          └────────┬─────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Toxicity Score │
 *                          │   (0.0 - 1.0)   │
 *                          └────────┬─────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Classification │
 *                          │ Safe/Warn/Unsafe│
 *                          └─────────────────┘
 * 
 * TRAINING DATA:
 * The model is trained on examples of safe and unsafe content.
 * You can customize the training data to match your moderation needs.
 * 
 * USAGE:
 * 1. Train the classifier on your moderation dataset (one-time)
 * 2. Check content in real-time as users type
 * 3. Take action based on toxicity score (block, warn, flag, etc.)
 * 
 * PERFORMANCE:
 * - Training: ~200-1000ms depending on dataset size
 * - Classification: <10ms per check
 * - Memory: ~2-5MB for typical models
 * 
 * ============================================================================
 */

// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713

const { ELM, UniversalEncoder } = window.astermind;

// ============================================================================
// TRAINING DATA - Customize for your use case
// ============================================================================

// Safe content examples (normal, appropriate text)
// Expanded with diverse examples covering various positive/neutral scenarios
const SAFE_EXAMPLES = [
    // Positive feedback
    "This is a great product!",
    "Thank you for your help.",
    "I love this website, it's very useful.",
    "Great job on the design!",
    "The service was excellent.",
    "I'm looking forward to trying this.",
    "This is exactly what I needed.",
    "Thanks for sharing this information.",
    "I appreciate your response.",
    "Nice work on this project.",
    "I found this very useful.",
    "Thank you for the quick response.",
    "This is exactly what I was looking for.",
    "I'm happy with this solution.",
    "This is a well-designed system.",
    "Excellent work, keep it up!",
    "I'm impressed with the quality.",
    "This exceeded my expectations.",
    "Wonderful job on this.",
    "I really appreciate this.",
    
    // Questions and requests
    "Can you help me with this question?",
    "I have a question about the features.",
    "Could you please explain this feature?",
    "I would like to learn more about this.",
    "This looks interesting, tell me more.",
    "How does this feature work?",
    "What are the benefits of this?",
    "Can you provide more details?",
    "I need help understanding this.",
    "Could you clarify this for me?",
    
    // Neutral/Informative
    "The weather is nice today.",
    "I enjoyed reading this article.",
    "This tutorial was very helpful.",
    "This is helpful information.",
    "This makes sense to me.",
    "I understand what you mean.",
    "That's a good point.",
    "I agree with your suggestion.",
    "Hello, how are you today?",
    "I see what you mean.",
    "That's an interesting perspective.",
    "I'll consider this option.",
    "Let me think about this.",
    "I need to review this first.",
    "This seems reasonable.",
    
    // Professional/Formal
    "I would like to schedule a meeting.",
    "Please send me the documentation.",
    "I need to discuss this with my team.",
    "Could you provide a quote?",
    "What are the next steps?",
    "I'll get back to you soon.",
    "Thank you for your time.",
    "I appreciate your assistance.",
    "Looking forward to your response.",
    "Please let me know if you need anything.",
];

// Warning examples (borderline, potentially problematic but not toxic)
// These express stronger frustration or negativity but aren't personal attacks
// Made more distinct from safe examples with stronger negative language
const WARNING_EXAMPLES = [
    // Strong frustration/Annoyance (but not personal)
    "I hate this stupid website",
    "This is so annoying and frustrating",
    "Why is this so complicated and broken?",
    "This doesn't work at all, it's terrible",
    "I'm really frustrated with this mess",
    "This is absolutely terrible",
    "I really don't like this at all",
    "This is confusing and broken",
    "Not helpful at all, completely useless",
    "Total waste of time and effort",
    "This is really frustrating and annoying",
    "I'm very annoyed by this problem",
    "This makes no sense whatsoever",
    "Why is this so difficult and broken?",
    "This is poorly designed and broken",
    "I'm very disappointed with this failure",
    "This is not what I expected, it's bad",
    "This is a complete waste of my time",
    "I'm really not happy with this mess",
    "This is really annoying and broken",
    
    // Strong criticism (negative but not personal)
    "This feature is completely broken",
    "The interface is confusing and bad",
    "This doesn't make sense at all",
    "I don't understand this mess",
    "This is way too complicated",
    "The design is really poor",
    "This is not user-friendly at all",
    "I'm having major trouble with this",
    "This needs serious improvement",
    "This is not working properly at all",
    
    // Strong negativity (but not attacking people)
    "I'm really not impressed with this",
    "This could be much better",
    "I expected way more than this",
    "This is very underwhelming",
    "Not what I was hoping for at all",
    "This is pretty mediocre",
    "I'm not satisfied with this result",
    "This needs a lot of work",
    "This is quite subpar",
    "I'm really not a fan of this",
];

// Unsafe examples (toxic, inappropriate content with personal attacks)
// These contain insults, threats, or highly offensive language
const UNSAFE_EXAMPLES = [
    // Explicit profanity and offensive language
    "stupid fuck wad",
    "you're a fucking idiot",
    "this is fucking stupid",
    "what the fuck is this",
    "you're a stupid asshole",
    "this is complete bullshit",
    "fuck you and your stupid ideas",
    "you're a fucking moron",
    "this is fucking garbage",
    "go fuck yourself",
    "you're a piece of shit",
    "this is shit and you're shit too",
    "fuck off you idiot",
    "you're a damn fool",
    "this is fucking terrible",
    
    // Personal attacks
    "You are an idiot and should go away",
    "You're stupid and don't know what you're doing",
    "You're terrible at this",
    "You're a complete failure",
    "You're worthless and should quit",
    "You don't know anything",
    "You're incompetent",
    "You're a moron",
    "You're clueless",
    "You're an absolute fool",
    
    // Hostile/Threatening
    "I hate you and everything you stand for",
    "Go away, nobody wants you here",
    "Get lost, you're not wanted",
    "You should just give up",
    "Nobody cares about your opinion",
    "You're a waste of space",
    "I can't stand you",
    "You're the worst",
    "You make me sick",
    "I despise you",
    
    // Extreme negativity with personal elements
    "This is complete garbage and you're terrible",
    "This is worthless trash and so are you",
    "You're a failure and this proves it",
    "You're incompetent and this is proof",
    "This is the worst thing ever and you're to blame",
    "You ruined everything",
    "You're the reason this is bad",
    "This is your fault, you idiot",
    "You're responsible for this mess",
    "You should be ashamed",
    
    // Highly offensive
    "You're a complete and total idiot",
    "This is garbage and you're garbage too",
    "You're stupid beyond belief",
    "You're an absolute moron",
    "You're the dumbest person I've ever seen",
    "You're completely useless",
    "You're a waste of everyone's time",
    "You're pathetic and worthless",
    "You're a disgrace",
    "You're an embarrassment",
];

// ============================================================================
// CONFIGURATION
// ============================================================================

// Toxicity thresholds
// Adjusted based on model performance
const THRESHOLDS = {
    SAFE: 0.25,     // Below 0.25 = Safe
    WARNING: 0.5,   // 0.25-0.5 = Warning
    UNSAFE: 0.5,   // Above 0.5 = Unsafe
};

// ============================================================================
// INITIALIZATION
// ============================================================================

let classifier = null;
let isReady = false;

// Store feedback examples for retraining
let feedbackExamples = {
    safe: [],
    warning: [],
    unsafe: []
};

// Track whether feedback was a correction (misclassified) or reinforcement (correct)
let feedbackMetadata = new Map(); // text -> { category, isCorrection }

// Store original training data for retraining
let originalTrainingData = {
    safe: [...SAFE_EXAMPLES],
    warning: [...WARNING_EXAMPLES],
    unsafe: [...UNSAFE_EXAMPLES]
};

/**
 * Initialize and train the toxicity classifier
 */
async function initializeClassifier() {
    console.log('🔧 Initializing content moderation classifier...');
    
    // Create ELM classifier
    // Categories: ['safe', 'warning', 'unsafe'] - 3-class classification
    classifier = new ELM({
        categories: ['safe', 'warning', 'unsafe'], // 3-class: safe, warning, unsafe
        hiddenUnits: 512, // Increased hidden units for better learning capacity
        maxLen: 100,
        useTokenizer: true, // Enable text mode
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
        tokenizerDelimiter: /\s+/, // Split on whitespace
        activation: 'tanh', // Changed to tanh for better gradient flow
        weightInit: 'xavier',
        ridgeLambda: 0.01, // Reduced regularization to allow model to learn distinctions better
        metrics: {
            accuracy: 0.75, // Minimum accuracy threshold
        },
    });
    
    // Get ELM's internal encoder - this is the one that will be used for prediction
    // We must use the same encoder for training to ensure consistent vector sizes
    const textEncoder = classifier['encoder'];
    if (!textEncoder) {
        throw new Error('Encoder not initialized');
    }
    
    // Get the expected vector size from the encoder
    // This is what the model will expect during prediction
    const expectedVectorSize = textEncoder.getVectorSize();
    console.log(`📏 Encoder vector size: ${expectedVectorSize} dimensions`);
    
    // Prepare training data
    // Encode texts using ELM's encoder and ensure consistent vector sizes
    const X = [];
    const Y = [];
    
    // Helper function to encode text and ensure it matches expected size
    const encodeAndPad = (text) => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        // Ensure vector is exactly the expected size
        // This is critical - the model weights are sized for this exact dimension
        if (vec.length !== expectedVectorSize) {
            const errorMsg = `Vector size mismatch for text "${text.substring(0, 50)}...": got ${vec.length}, expected ${expectedVectorSize}`;
            console.error(`❌ ${errorMsg}`);
            // Pad or truncate to expected size to prevent training failure
            const fixed = vec.slice(0, expectedVectorSize);
            while (fixed.length < expectedVectorSize) {
                fixed.push(0);
            }
            console.warn(`   Fixed to ${fixed.length} dimensions`);
            return fixed;
        }
        return vec;
    };
    
    // Prepare sample weights to balance class learning
    // Give more weight to warning examples since they're the middle category
    const sampleWeights = [];
    
    // Safe examples
    SAFE_EXAMPLES.forEach(text => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 0)); // 'safe' is index 0
        sampleWeights.push(1.0); // Normal weight
    });
    
    // Warning examples - now properly labeled as 'warning'
    // Give higher weight to help model learn this category better
    WARNING_EXAMPLES.forEach(text => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 1)); // 'warning' is index 1
        sampleWeights.push(2.0); // Double weight to emphasize learning
    });
    
    // Unsafe examples - give higher weight to profanity examples
    UNSAFE_EXAMPLES.forEach((text, index) => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 2)); // 'unsafe' is index 2
        // Give profanity examples extra weight (first 15 examples)
        sampleWeights.push(index < 15 ? 2.5 : 1.5); // Higher weight for profanity
    });
    
    // Verify all vectors have consistent size
    const firstSize = X[0]?.length;
    if (!firstSize) {
        throw new Error('No training vectors created');
    }
    
    if (firstSize !== expectedVectorSize) {
        throw new Error(`Vector size mismatch: first vector is ${firstSize}, expected ${expectedVectorSize}. This will cause dimension errors during prediction.`);
    }
    
    // Check all vectors are the same size
    const sizeCounts = {};
    X.forEach((v, i) => {
        const size = v.length;
        if (!sizeCounts[size]) {
            sizeCounts[size] = [];
        }
        sizeCounts[size].push(i);
    });
    
    const sizes = Object.keys(sizeCounts).map(Number);
    if (sizes.length > 1) {
        console.error('❌ Inconsistent vector sizes detected:');
        sizes.forEach(size => {
            console.error(`   Size ${size}: ${sizeCounts[size].length} vectors (indices: ${sizeCounts[size].slice(0, 5).join(', ')}...)`);
        });
        throw new Error(`Training vectors have inconsistent sizes: ${sizes.join(', ')}. All vectors must be ${expectedVectorSize} dimensions.`);
    }
    
    console.log(`📚 Training on ${X.length} examples (all vectors: ${firstSize} dimensions, matches expected: ${expectedVectorSize})...`);
    console.log(`   - Safe: ${SAFE_EXAMPLES.length}`);
    console.log(`   - Warning: ${WARNING_EXAMPLES.length}`);
    console.log(`   - Unsafe: ${UNSAFE_EXAMPLES.length}`);
    
    const startTime = performance.now();
    
    // Train the classifier with sample weights to balance learning
    // Warning examples get 2x weight to help model distinguish them from safe
    classifier.trainFromData(X, Y, { weights: sampleWeights });
    
    // Verify model was trained with correct input dimension
    if (classifier.model && classifier.model.W) {
        const modelInputDim = classifier.model.W[0].length;
        console.log(`✅ Model trained with input dimension: ${modelInputDim}`);
        if (modelInputDim !== expectedVectorSize) {
            console.error(`❌ CRITICAL: Model input dimension (${modelInputDim}) doesn't match encoder vector size (${expectedVectorSize})!`);
            console.error(`   This will cause prediction errors. The encoder will produce ${expectedVectorSize}-dim vectors, but model expects ${modelInputDim}-dim vectors.`);
        }
    }
    
    const trainTime = performance.now() - startTime;
    console.log(`✅ Training complete in ${trainTime.toFixed(2)}ms`);
    
    // Validate training by checking predictions on training data
    console.log('🔍 Validating training...');
    let correct = 0;
    let total = 0;
    
    // Check safe examples
    SAFE_EXAMPLES.slice(0, 5).forEach(text => {
        const result = classifyContent(text);
        total++;
        if (result.category === 'safe') correct++;
        console.log(`   "${text.substring(0, 30)}..." -> ${result.category} (toxicity: ${(result.score * 100).toFixed(1)}%)`);
    });
    
    // Check warning examples
    WARNING_EXAMPLES.slice(0, 3).forEach(text => {
        const result = classifyContent(text);
        total++;
        if (result.category === 'warning') correct++;
        console.log(`   "${text.substring(0, 30)}..." -> ${result.category} (toxicity: ${(result.score * 100).toFixed(1)}%)`);
    });
    
    // Check unsafe examples
    UNSAFE_EXAMPLES.slice(0, 3).forEach(text => {
        const result = classifyContent(text);
        total++;
        if (result.category === 'unsafe') correct++;
        console.log(`   "${text.substring(0, 30)}..." -> ${result.category} (toxicity: ${(result.score * 100).toFixed(1)}%)`);
    });
    
    const accuracy = (correct / total * 100).toFixed(1);
    console.log(`📊 Training validation: ${correct}/${total} correct (${accuracy}%)`);
    
    if (accuracy < 60) {
        console.warn('⚠️ Model accuracy is low. Consider adding more training examples or adjusting model parameters.');
    }
    
    // Test the classifier
    testClassifier();
    
    isReady = true;
    console.log('🚀 Content moderation system ready!');
}

/**
 * Test the classifier with sample inputs
 */
function testClassifier() {
    console.log('🧪 Testing classifier...');
    
    const testCases = [
        { text: "This is great!", expected: 'safe' },
        { text: "I hate this stupid website", expected: 'warning' },
        { text: "You're an idiot and should go away", expected: 'unsafe' },
        { text: "stupid fuck wad", expected: 'unsafe' }, // Test profanity detection
    ];
    
    testCases.forEach(({ text, expected }) => {
        const result = classifyContent(text);
        console.log(`   "${text}" -> ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
    });
}

/**
 * Classify content for toxicity
 * @param {string} content - Text content to check
 * @returns {Object} Classification result with category and confidence
 */
function classifyContent(content) {
    if (!isReady || !content.trim()) {
        return {
            category: 'unknown',
            confidence: 0,
            score: 0,
        };
    }
    
    // Get predictions from the classifier
    // Returns array of { label, prob } sorted by probability (highest first)
    const predictions = classifier.predict(content.toLowerCase());
    
    // Get probabilities for each category
    const safePrediction = predictions.find(p => p.label === 'safe');
    const warningPrediction = predictions.find(p => p.label === 'warning');
    const unsafePrediction = predictions.find(p => p.label === 'unsafe');
    const safeProb = safePrediction ? safePrediction.prob : 0;
    const warningProb = warningPrediction ? warningPrediction.prob : 0;
    const unsafeProb = unsafePrediction ? unsafePrediction.prob : 0;
    
    // Toxicity score combines warning and unsafe probabilities
    const toxicityScore = warningProb + unsafeProb;
    
    // Use the model's top prediction (highest probability)
    // The model now has 3 classes, so it can properly distinguish them
    const topPrediction = predictions[0];
    let category = topPrediction ? topPrediction.label : 'safe';
    
    // Safety check: If unsafe probability is high (>50%), override to unsafe
    // This catches cases where profanity might be misclassified
    if (unsafeProb > 0.5) {
        category = 'unsafe';
    }
    // If warning probability is high (>40%) and unsafe is moderate, use warning
    else if (warningProb > 0.4 && unsafeProb < 0.5) {
        category = 'warning';
    }
    // Otherwise trust the model's top prediction
    
    // Confidence is the probability of the predicted category
    // Use the model's probability for the predicted category
    let confidence;
    if (category === 'safe') {
        confidence = safeProb;
    } else if (category === 'warning') {
        confidence = warningProb;
    } else {
        confidence = unsafeProb;
    }
    
    return {
        category,
        confidence,
        score: toxicityScore,
        predictions, // Full prediction array for debugging
    };
}

/**
 * Handle user feedback (thumbs up/down)
 */
async function handleFeedback(feedbackData, isCorrect) {
    const { content, category } = feedbackData;
    const feedbackMessage = document.getElementById('feedbackMessage');
    
    if (isCorrect) {
        // Reinforce the correct classification
        feedbackMessage.innerHTML = '<span style="color: #2196F3;">🔄 Reinforcing correct classification...</span>';
        
        try {
            // Add to feedback examples with correct category to reinforce
            if (!feedbackExamples[category].includes(content)) {
                feedbackExamples[category].push(content);
                console.log(`📝 Reinforcing: "${content.substring(0, 50)}..." → ${category}`);
            }
            
            // Retrain to reinforce this pattern (lighter weight than corrections)
            await retrainClassifier();
            
            feedbackMessage.innerHTML = `
                <span style="color: #4CAF50;">✓ Model reinforced! (${feedbackExamples.safe.length + feedbackExamples.warning.length + feedbackExamples.unsafe.length} feedback examples)</span>
                <div style="margin-top: 5px; font-size: 11px; color: #666;">
                    Safe: ${feedbackExamples.safe.length}, Warning: ${feedbackExamples.warning.length}, Unsafe: ${feedbackExamples.unsafe.length}
                </div>
            `;
            
            // Disable buttons after feedback
            document.getElementById('thumbsUpBtn').disabled = true;
            document.getElementById('thumbsDownBtn').disabled = true;
            
        } catch (error) {
            console.error('❌ Reinforcement error:', error);
            feedbackMessage.innerHTML = `<span style="color: #f44336;">❌ Error: ${error.message}</span>`;
        }
        return;
    }
    
    // If incorrect, ask user for correct category
    feedbackMessage.innerHTML = `
        <div style="margin-bottom: 10px;">What should this be classified as?</div>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button class="category-select-btn" data-category="safe" 
                    style="padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Safe
            </button>
            <button class="category-select-btn" data-category="warning" 
                    style="padding: 8px 15px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Warning
            </button>
            <button class="category-select-btn" data-category="unsafe" 
                    style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Unsafe
            </button>
        </div>
    `;
    
    // Attach category selection handlers
    document.querySelectorAll('.category-select-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const correctCategory = e.target.getAttribute('data-category');
            await retrainWithFeedback(content, category, correctCategory);
        });
    });
}

/**
 * Retrain model with user feedback
 */
async function retrainWithFeedback(text, predictedCategory, correctCategory) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    
    // Don't retrain if user selected the same category
    if (predictedCategory === correctCategory) {
        feedbackMessage.innerHTML = '<span style="color: #666;">This is already classified as ' + correctCategory + '. No retraining needed.</span>';
        return;
    }
    
    feedbackMessage.innerHTML = '<span style="color: #2196F3;">🔄 Retraining model with your feedback...</span>';
    
    try {
        // Add to feedback examples
        if (!feedbackExamples[correctCategory].includes(text)) {
            feedbackExamples[correctCategory].push(text);
            console.log(`📝 Added feedback: "${text.substring(0, 50)}..." → ${correctCategory}`);
        }
        
        // Retrain with all original data + feedback examples
        await retrainClassifier();
        
        feedbackMessage.innerHTML = `
            <span style="color: #4CAF50;">✓ Model retrained! (${feedbackExamples.safe.length + feedbackExamples.warning.length + feedbackExamples.unsafe.length} feedback examples)</span>
            <div style="margin-top: 5px; font-size: 11px; color: #666;">
                Safe: ${feedbackExamples.safe.length}, Warning: ${feedbackExamples.warning.length}, Unsafe: ${feedbackExamples.unsafe.length}
            </div>
        `;
        
        // Disable feedback buttons
        document.getElementById('thumbsUpBtn').disabled = true;
        document.getElementById('thumbsDownBtn').disabled = true;
        
        // Re-classify the current content with updated model
        const result = classifyContent(text);
        setTimeout(() => {
            renderResult(text, result);
        }, 100);
        
    } catch (error) {
        console.error('❌ Retraining error:', error);
        feedbackMessage.innerHTML = `<span style="color: #f44336;">❌ Error retraining: ${error.message}</span>`;
    }
}

/**
 * Retrain classifier with original data + feedback examples
 */
async function retrainClassifier() {
    console.log('🔄 Retraining model with feedback examples...');
    
    // Get ELM's encoder
    const textEncoder = classifier['encoder'];
    if (!textEncoder) {
        throw new Error('Encoder not initialized');
    }
    
    const expectedVectorSize = textEncoder.getVectorSize();
    
    // Helper to encode text
    const encodeAndPad = (text) => {
        const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
        if (vec.length !== expectedVectorSize) {
            const fixed = vec.slice(0, expectedVectorSize);
            while (fixed.length < expectedVectorSize) {
                fixed.push(0);
            }
            return fixed;
        }
        return vec;
    };
    
    // Prepare training data: original + feedback
    const X = [];
    const Y = [];
    const sampleWeights = [];
    
    // Combine original and feedback examples
    const allSafe = [...originalTrainingData.safe, ...feedbackExamples.safe];
    const allWarning = [...originalTrainingData.warning, ...feedbackExamples.warning];
    const allUnsafe = [...originalTrainingData.unsafe, ...feedbackExamples.unsafe];
    
    // Helper to check if text was a correction (misclassified) or reinforcement (correct)
    const isCorrection = (text, correctCategory) => {
        // Check if text exists in other categories' feedback (meaning it was misclassified)
        for (const [cat, examples] of Object.entries(feedbackExamples)) {
            if (cat !== correctCategory && examples.includes(text)) {
                return true; // Was in wrong category, so it's a correction
            }
        }
        return false; // Not found in other categories, so it's a reinforcement
    };
    
    // Safe examples
    allSafe.forEach((text, index) => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 0));
        const isFeedback = index >= originalTrainingData.safe.length;
        const correction = isCorrection(text, 'safe');
        sampleWeights.push(isFeedback ? (correction ? 3.0 : 1.5) : 1.0); // Corrections: 3x, Reinforcements: 1.5x
    });
    
    // Warning examples (give feedback examples higher weight)
    allWarning.forEach((text, index) => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 1));
        const isFeedback = index >= originalTrainingData.warning.length;
        const correction = isCorrection(text, 'warning');
        sampleWeights.push(isFeedback ? (correction ? 3.0 : 1.5) : 2.0); // Corrections: 3x, Reinforcements: 1.5x
    });
    
    // Unsafe examples (give feedback examples higher weight)
    allUnsafe.forEach((text, index) => {
        X.push(encodeAndPad(text));
        Y.push(classifier.oneHot(3, 2));
        const isFeedback = index >= originalTrainingData.unsafe.length;
        const isProfanity = index < 15; // First 15 are profanity
        const correction = isCorrection(text, 'unsafe');
        if (isFeedback) {
            sampleWeights.push(correction ? 3.0 : 1.5); // Corrections: 3x, Reinforcements: 1.5x
        } else {
            sampleWeights.push(isProfanity ? 2.5 : 1.5);
        }
    });
    
    console.log(`📚 Retraining on ${X.length} examples (${allSafe.length} safe, ${allWarning.length} warning, ${allUnsafe.length} unsafe)`);
    
    // Retrain with reuseWeights to keep the same random features
    classifier.trainFromData(X, Y, { 
        reuseWeights: true, // Keep same W and b, only update beta
        weights: sampleWeights 
    });
    
    console.log('✅ Retraining complete');
}

/**
 * Render classification result to the DOM
 */
function renderResult(content, result) {
    const resultSection = document.getElementById('resultSection');
    
    if (!content.trim()) {
        resultSection.innerHTML = '<div class="loading">Ready! Enter text above to check...</div>';
        return;
    }
    
    const { category, confidence, score, predictions } = result;
    
    // Get emoji and color based on category
    const categoryInfo = {
        safe: { emoji: '✅', label: 'Safe Content', class: 'safe' },
        warning: { emoji: '⚠️', label: 'Warning - Review Needed', class: 'warning' },
        unsafe: { emoji: '🚫', label: 'Unsafe Content - Block', class: 'unsafe' },
    };
    
    const info = categoryInfo[category] || categoryInfo.safe;
    
    // Calculate confidence percentage
    const confidencePercent = Math.round(confidence * 100);
    const toxicityPercent = Math.round(score * 100);
    
    // Get top predictions for display
    const topPredictions = predictions.slice(0, 2);
    
    // Store current content and result for feedback
    const feedbackData = { content, category, result };
    
    resultSection.innerHTML = `
        <div class="result-card ${info.class}">
            <div class="result-header ${info.class}">
                <span>${info.emoji}</span>
                <span>${info.label}</span>
            </div>
            
            <div class="confidence-bar">
                <div class="confidence-fill ${info.class}" style="width: ${confidencePercent}%"></div>
            </div>
            
            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">Toxicity Score:</span>
                    <span class="detail-value">${toxicityPercent}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${confidencePercent}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Classification:</span>
                    <span class="detail-value">${category.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Top Predictions:</span>
                    <span class="detail-value">
                        ${topPredictions.map(p => 
                            `${p.label} (${Math.round(p.prob * 100)}%)`
                        ).join(', ')}
                    </span>
                </div>
            </div>
            
            <div class="feedback-section" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <div style="margin-bottom: 10px; font-size: 14px; color: #666;">Was this classification correct?</div>
                <div class="feedback-buttons" style="display: flex; gap: 10px;">
                    <button id="thumbsUpBtn" class="feedback-btn thumbs-up" 
                            style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        👍 Correct
                    </button>
                    <button id="thumbsDownBtn" class="feedback-btn thumbs-down" 
                            style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        👎 Incorrect
                    </button>
                </div>
                <div id="feedbackMessage" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
            </div>
        </div>
    `;
    
    // Attach feedback handlers
    document.getElementById('thumbsUpBtn').addEventListener('click', () => {
        handleFeedback(feedbackData, true);
    });
    
    document.getElementById('thumbsDownBtn').addEventListener('click', () => {
        handleFeedback(feedbackData, false);
    });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

let checkTimeout = null;

/**
 * Handle content input with debouncing
 */
document.getElementById('contentInput').addEventListener('input', (e) => {
    const content = e.target.value;
    
    // Clear previous timeout
    if (checkTimeout) {
        clearTimeout(checkTimeout);
    }
    
    // Debounce: check 300ms after user stops typing
    checkTimeout = setTimeout(() => {
        if (!isReady) {
            document.getElementById('resultSection').innerHTML = 
                '<div class="loading">Initializing moderation system...</div>';
            return;
        }
        
        const result = classifyContent(content);
        renderResult(content, result);
    }, 300);
});

/**
 * Handle example button clicks
 */
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        document.getElementById('contentInput').value = text;
        
        // Trigger input event to check the content
        const event = new Event('input', { bubbles: true });
        document.getElementById('contentInput').dispatchEvent(event);
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
        document.getElementById('resultSection').innerHTML = 
            `<div class="result-card unsafe">
                <div class="result-header unsafe">❌ Error</div>
                <p>Failed to initialize: ${error.message}</p>
            </div>`;
    }
});




