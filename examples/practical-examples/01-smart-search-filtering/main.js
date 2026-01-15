/**
 * ============================================================================
 * SMART SEARCH & FILTERING - Practical Example for Front-End Developers
 * ============================================================================
 * 
 * PROBLEM:
 * Front-end developers often need to implement search/filtering functionality
 * that works in real-time without server round-trips. Traditional approaches:
 * - Simple string matching (limited, no semantic understanding)
 * - Server-side search APIs (latency, cost, privacy concerns)
 * - Heavy client-side libraries (large bundle size, slow initialization)
 * 
 * SOLUTION:
 * Use AsterMind ELM to create semantic embeddings that understand meaning,
 * not just keywords. This enables:
 * - Instant search results (no network latency)
 * - Semantic understanding (finds related content, not just exact matches)
 * - Privacy-first (all processing happens in the browser)
 * - Small footprint (lightweight ML model)
 * - Works offline
 * 
 * HOW IT WORKS:
 * 
 *     User Query
 *         |
 *         v
 *     [Text Encoder] --> Vector Embedding (e.g., 128 dimensions)
 *         |
 *         v
 *     [EmbeddingStore] --> Compare with stored document embeddings
 *         |
 *         v
 *     [Cosine Similarity] --> Rank by relevance
 *         |
 *         v
 *     Display Top Results
 * 
 * ARCHITECTURE DIAGRAM:
 * 
 *     ┌─────────────┐
 *     │ Search Input│
 *     └──────┬──────┘
 *            │
 *            v
 *     ┌──────────────┐      ┌─────────────┐
 *     │  ELM Encoder │─────>│  Embedding  │
 *     │  (Trained)   │      │   Vector    │
 *     └──────────────┘      └──────┬──────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │ EmbeddingStore  │
 *                          │  (All Docs)     │
 *                          └────────┬────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │ Cosine Similarity│
 *                          │   Ranking       │
 *                          └────────┬────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Top K Results  │
 *                          └─────────────────┘
 * 
 * USAGE:
 * 1. Train the encoder on your document corpus (one-time setup)
 * 2. Store document embeddings in EmbeddingStore
 * 3. When user searches, encode query and find similar documents
 * 4. Display results ranked by similarity score
 * 
 * PERFORMANCE:
 * - Training: ~100-500ms for small-medium datasets
 * - Search: <10ms per query (real-time)
 * - Memory: ~1-5MB for typical datasets
 * 
 * ============================================================================
 */

// © 2025 AsterMind LLC – All Rights Reserved.
// Patent Pending US 63/897,713

const { ELM, EmbeddingStore, UniversalEncoder } = window.astermind;

// ============================================================================
// SAMPLE DATA - Replace with your actual data
// ============================================================================
const PRODUCTS = [
    { id: 1, title: "Wireless Bluetooth Headphones", description: "Premium noise-cancelling headphones with 30-hour battery life" },
    { id: 2, title: "Smart Fitness Tracker", description: "Track steps, heart rate, sleep, and workouts with GPS" },
    { id: 3, title: "Portable Phone Charger", description: "10000mAh power bank with fast charging and USB-C port" },
    { id: 4, title: "Mechanical Gaming Keyboard", description: "RGB backlit keyboard with Cherry MX switches" },
    { id: 5, title: "4K Webcam for Streaming", description: "Ultra HD camera with auto-focus and built-in microphone" },
    { id: 6, title: "Ergonomic Office Chair", description: "Adjustable lumbar support and mesh back for comfort" },
    { id: 7, title: "Standing Desk Converter", description: "Convert any desk to standing desk with electric height adjustment" },
    { id: 8, title: "Blue Light Blocking Glasses", description: "Reduce eye strain from screens with stylish frames" },
    { id: 9, title: "USB-C Hub with HDMI", description: "Connect multiple devices to your laptop with 8 ports" },
    { id: 10, title: "Wireless Mouse with Gestures", description: "Precision tracking with customizable gesture controls" },
    { id: 11, title: "Monitor Stand with Storage", description: "Raise your monitor and organize cables with built-in storage" },
    { id: 12, title: "Desk Lamp with Wireless Charging", description: "LED lamp that charges your phone via Qi charging pad" },
    { id: 13, title: "Laptop Cooling Pad", description: "Keep your laptop cool with quiet fans and adjustable height" },
    { id: 14, title: "Cable Management System", description: "Organize and hide cables with adhesive clips and sleeves" },
    { id: 15, title: "Anti-Fatigue Standing Mat", description: "Comfortable mat for standing desks with memory foam" },
];

// ============================================================================
// INITIALIZATION
// ============================================================================

let encoder = null;
let embeddingStore = null;
let isReady = false;

/**
 * Initialize the ELM encoder for text embeddings
 * This creates a model that converts text into numerical vectors
 */
async function initializeEncoder() {
    console.log('🔧 Initializing encoder...');
    
    // Create a UniversalEncoder for text preprocessing
    // This handles character/token encoding, normalization, etc.
    const textEncoder = new UniversalEncoder({
        charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
        maxLen: 50, // Maximum sequence length
        useTokenizer: true, // Use word-level tokens instead of characters
        tokenizerDelimiter: /\s+/, // Split on whitespace
    });
    
    // Create ELM model for encoding
    // This will learn to create meaningful embeddings from text
    // We'll train it on a classification task, then use hidden layer as embeddings
    encoder = new ELM({
        categories: PRODUCTS.map((p, i) => `product-${i}`), // Each product as a category
        hiddenUnits: 128, // Size of embedding vector (128 dimensions)
        maxLen: 50,
        useTokenizer: true, // Enable text mode
        encoder: textEncoder,
        activation: 'relu', // ReLU activation for non-linearity
        weightInit: 'xavier', // Xavier initialization for better gradients
        ridgeLambda: 0.01, // Regularization to prevent overfitting
    });
    
    // Prepare training data
    // We'll use the product descriptions as training examples
    // Train on classification task: each product text -> its category
    const trainingTexts = PRODUCTS.map(p => 
        `${p.title} ${p.description}`.toLowerCase()
    );
    
    // Encode training texts into vectors
    const X = [];
    const Y = [];
    
    for (let i = 0; i < trainingTexts.length; i++) {
        const text = trainingTexts[i];
        // Encode text to vector
        const vec = textEncoder.normalize(textEncoder.encode(text));
        X.push(vec);
        // One-hot encoding: product i -> category i
        const oneHot = encoder.oneHot(encoder.categories.length, i);
        Y.push(oneHot);
    }
    
    console.log(`📚 Training on ${X.length} examples...`);
    const startTime = performance.now();
    
    // Train the encoder on classification task
    // The hidden layer will learn good feature representations (embeddings)
    encoder.trainFromData(X, Y);
    
    const trainTime = performance.now() - startTime;
    console.log(`✅ Training complete in ${trainTime.toFixed(2)}ms`);
    
    // Verify model is trained
    if (!encoder.model) {
        throw new Error('Model training failed - model is null');
    }
    console.log('✅ Model verified and ready');
    
    // Build the embedding store
    buildEmbeddingStore();
    
    isReady = true;
    console.log('🚀 Search system ready!');
}

/**
 * Build the EmbeddingStore with all product embeddings
 * This stores vector representations of all documents for fast similarity search
 */
function buildEmbeddingStore() {
    console.log('📦 Building embedding store...');
    
    // Create a new EmbeddingStore
    // First parameter is the embedding dimension (128 from hiddenUnits)
    // storeUnit: true ensures vectors are unit-length for cosine similarity
    // capacity: maximum number of items (ring buffer behavior if exceeded)
    embeddingStore = new EmbeddingStore(128, {
        capacity: 1000,
        storeUnit: true, // Normalize vectors for cosine similarity
    });
    
    // Generate embeddings for all products and store them
    PRODUCTS.forEach(product => {
        // Combine title and description for richer representation
        const text = `${product.title} ${product.description}`.toLowerCase();
        
        // Encode text to vector using the encoder's internal encoder
        const textEncoder = encoder['encoder'];
        const vec = textEncoder.normalize(textEncoder.encode(text));
        
        // Get embedding vector from the ELM
        // This converts text to a 128-dimensional vector
        // getEmbedding returns number[][], so we get the first element
        let embeddingBatch;
        try {
            embeddingBatch = encoder.getEmbedding([vec]);
        } catch (error) {
            console.error(`Error getting embedding for product ${product.id}:`, error);
            return; // Skip this product
        }
        
        // Ensure we have a valid array
        if (!Array.isArray(embeddingBatch) || !embeddingBatch[0] || !Array.isArray(embeddingBatch[0])) {
            console.error(`Failed to get embedding for product ${product.id}:`, embeddingBatch);
            console.error('Type:', typeof embeddingBatch, 'IsArray:', Array.isArray(embeddingBatch));
            return; // Skip this product
        }
        
        const embedding = embeddingBatch[0];
        
        // Verify embedding is a proper array of numbers
        if (!Array.isArray(embedding) || embedding.some(v => typeof v !== 'number')) {
            console.error(`Invalid embedding for product ${product.id}:`, embedding);
            return; // Skip this product
        }
        
        // Store in the embedding store with metadata
        // The metadata allows us to retrieve the original product info
        embeddingStore.add({
            id: `product-${product.id}`,
            vec: embedding,
            meta: {
                title: product.title,
                description: product.description,
                id: product.id,
            }
        });
    });
    
    console.log(`✅ Stored ${embeddingStore.size()} embeddings`);
}

/**
 * Perform semantic search
 * @param {string} query - User's search query
 * @param {number} topK - Number of results to return
 * @returns {Array} Array of results with similarity scores
 */
function search(query, topK = 10) {
    if (!isReady || !query.trim()) {
        return [];
    }
    
    const startTime = performance.now();
    
    // Step 1: Encode the query into an embedding vector
    // This converts the search text into the same vector space as documents
    const textEncoder = encoder['encoder'];
    const queryVec = textEncoder.normalize(textEncoder.encode(query.toLowerCase()));
    const queryEmbeddingBatch = encoder.getEmbedding([queryVec]);
    
    // Ensure we have a valid embedding
    if (!Array.isArray(queryEmbeddingBatch) || !queryEmbeddingBatch[0] || !Array.isArray(queryEmbeddingBatch[0])) {
        console.error('Failed to get query embedding');
        return { results: [], searchTime: 0 };
    }
    
    const queryEmbedding = queryEmbeddingBatch[0];
    
    // Step 2: Find similar documents using cosine similarity
    // Cosine similarity measures the angle between vectors (0-1 scale)
    // Higher score = more similar
    const results = embeddingStore.query(
        queryEmbedding, // Query vector (first parameter)
        topK, // Return top K results
        { metric: 'cosine' } // Options: Use cosine similarity (works well with normalized vectors)
    );
    
    const searchTime = performance.now() - startTime;
    
    console.log(`🔍 Search completed in ${searchTime.toFixed(2)}ms`);
    
    return {
        results: results.map(hit => ({
            ...hit.meta,
            score: hit.score, // Similarity score (0-1)
        })),
        searchTime,
    };
}

/**
 * Render search results to the DOM
 */
function renderResults(query, searchData) {
    const resultsEl = document.getElementById('results');
    const countEl = document.getElementById('resultCount');
    const timeEl = document.getElementById('searchTime');
    
    // Update stats
    countEl.textContent = `${searchData.results.length} results`;
    timeEl.textContent = `${searchData.searchTime.toFixed(1)}ms`;
    
    // Clear previous results
    resultsEl.innerHTML = '';
    
    if (searchData.results.length === 0) {
        resultsEl.innerHTML = '<div class="loading">No results found. Try different keywords.</div>';
        return;
    }
    
    // Render each result
    searchData.results.forEach((product, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'result-item';
        
        // Calculate relevance percentage
        const relevancePercent = Math.round(product.score * 100);
        
        itemEl.innerHTML = `
            <div class="result-title">${product.title}</div>
            <div class="result-description">${product.description}</div>
            <span class="result-score">${relevancePercent}% match</span>
        `;
        
        resultsEl.appendChild(itemEl);
    });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

let searchTimeout = null;

/**
 * Handle search input with debouncing
 * Debouncing prevents excessive searches while user is typing
 */
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce: wait 150ms after user stops typing
    searchTimeout = setTimeout(() => {
        if (!isReady) {
            document.getElementById('results').innerHTML = 
                '<div class="loading">Initializing search system...</div>';
            return;
        }
        
        if (!query) {
            renderResults('', { results: [], searchTime: 0 });
            return;
        }
        
        // Perform search and render results
        const searchData = search(query);
        renderResults(query, searchData);
    }, 150);
});

// ============================================================================
// STARTUP
// ============================================================================

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeEncoder();
        document.getElementById('results').innerHTML = 
            '<div class="loading">Ready! Start typing to search...</div>';
    } catch (error) {
        console.error('❌ Initialization error:', error);
        document.getElementById('results').innerHTML = 
            `<div class="error">Error: ${error.message}</div>`;
    }
});




