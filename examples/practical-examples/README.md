# Practical Examples - AsterMind ELM

This folder contains practical, tested examples that solve real pain points for front-end developers using AsterMind ELM. Each example is:

- ✅ **Tested** - Fully functional and ready to use
- ✅ **Practical** - Solves real-world problems developers face
- ✅ **Well-documented** - Extensive comments and explanations
- ✅ **Easy to use** - Simple setup, clear instructions

## Examples

### 1. Smart Search & Filtering
**Location:** `01-smart-search-filtering/`

**Problem Solved:** Real-time semantic search without server calls

**What it does:**
- Provides instant search results using semantic understanding
- Works entirely client-side (privacy-first)
- No network latency or API costs
- Understands meaning, not just keywords

**Use cases:**
- Product search in e-commerce
- Document search in knowledge bases
- Content filtering in dashboards
- Real-time filtering of large datasets

**How to use:**
1. Open `index.html` in a browser
2. Start typing in the search box
3. See instant semantic search results

**Key concepts:**
- Text embeddings using ELM encoder
- EmbeddingStore for fast similarity search
- Cosine similarity for ranking

---

### 2. Content Moderation
**Location:** `02-content-moderation/`

**Problem Solved:** On-device toxicity detection without sending data to servers

**What it does:**
- Detects inappropriate content in real-time
- Classifies content as Safe/Warning/Unsafe
- Provides confidence scores
- Works entirely in the browser

**Use cases:**
- Comment moderation
- Chat message filtering
- User-generated content review
- Form input validation

**How to use:**
1. Open `index.html` in a browser
2. Enter text in the textarea
3. See real-time toxicity classification
4. Try the example buttons for different scenarios

**Key concepts:**
- Binary classification (safe vs unsafe)
- Confidence thresholds
- Real-time classification

---

### 3. Smart Form Autocomplete
**Location:** `03-smart-form-autocomplete/`

**Problem Solved:** Intelligent form completion that learns from user patterns

**What it does:**
- Provides context-aware autocomplete suggestions
- Learns from user input history
- Works for various field types (names, emails, etc.)
- No server round-trips

**Use cases:**
- Registration forms
- Contact forms
- Search forms
- Any form with repetitive input

**How to use:**
1. Open `index.html` in a browser
2. Start typing in any form field
3. See intelligent autocomplete suggestions
4. Click suggestions or use arrow keys to navigate

**Key concepts:**
- Character-level autocomplete models
- Field-specific training
- Real-time suggestion generation

---

### 4. User Intent Classification
**Location:** `04-user-intent-classification/`

**Problem Solved:** Understand what users want to do from their messages

**What it does:**
- Classifies user messages into intent categories
- Provides confidence scores for all intents
- Suggests appropriate actions
- Routes requests intelligently

**Use cases:**
- Customer support routing
- Chatbot intent detection
- Request prioritization
- User experience personalization

**How to use:**
1. Open `index.html` in a browser
2. Enter a user message or query
3. See intent classification with confidence scores
4. View suggested actions based on intent

**Key concepts:**
- Multi-class classification
- Intent categories (purchase, support, inquiry, etc.)
- Action routing based on intent

---

### 5. Personalized Recommendations
**Location:** `05-personalized-recommendations/`

**Problem Solved:** Personalized content recommendations without server-side engines

**What it does:**
- Learns from user interactions in real-time
- Generates personalized recommendations
- Works entirely client-side
- Adapts as user behavior changes

**Use cases:**
- Product recommendations
- Content recommendations
- Personalized dashboards
- User experience customization

**How to use:**
1. Open `index.html` in a browser
2. Click on items you like (they'll turn green)
3. See personalized recommendations appear
4. More interactions = better recommendations

**Key concepts:**
- User profile embeddings
- Item embeddings
- Cosine similarity for recommendations
- Real-time learning

---

## Getting Started

### Prerequisites

All examples use the AsterMind ELM library from CDN. No installation required!

### Running Examples

1. **Simple method:** Open `index.html` directly in a modern browser
2. **Local server (recommended):** Use a local web server to avoid CORS issues

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000/examples/practical-examples/[example-name]/`

### Understanding the Code

Each example includes:
- **Detailed header comments** explaining the problem and solution
- **ASCII architecture diagrams** showing how components interact
- **Inline comments** explaining each step
- **Performance notes** about training and inference times

### Customization

All examples are designed to be easily customizable:

1. **Training data:** Modify the example data arrays to match your use case
2. **Configuration:** Adjust model parameters (hiddenUnits, activation, etc.)
3. **UI:** Customize the HTML/CSS to match your design
4. **Integration:** Copy the JavaScript logic into your application

---

## Common Patterns

### Pattern 1: Text Classification
```javascript
// Initialize encoder
const encoder = new UniversalEncoder({...});
const classifier = new ELM({
    categories: ['class1', 'class2'],
    encoder: encoder,
    ...
});

// Train
classifier.train(trainingData);

// Predict
const predictions = classifier.predict(text);
```

### Pattern 2: Semantic Search
```javascript
// Initialize encoder
const encoder = new ELM({...});
encoder.train(trainingData);

// Build embedding store
const store = new EmbeddingStore({...});
store.add({ id: 'doc1', vector: embedding, meta: {...} });

// Search
const results = store.query({
    vector: queryEmbedding,
    k: 10,
    metric: 'cosine'
});
```

### Pattern 3: Autocomplete
```javascript
// Initialize autocomplete
const autocomplete = new AutoComplete(trainingPairs, {
    charSet: '...',
    hiddenUnits: 64,
    ...
});

// Train
autocomplete.train();

// Get suggestions
const suggestions = autocomplete.predict(partialInput, topK);
```

---

## Performance Tips

1. **Training time:** Typically 50-1000ms depending on dataset size
2. **Inference time:** Usually <10ms per prediction
3. **Memory usage:** 1-5MB for typical models
4. **Optimization:** Use smaller hiddenUnits for faster inference

---

## Troubleshooting

### Example doesn't load
- Check browser console for errors
- Ensure you have internet connection (for CDN)
- Try using a local server instead of file://

### Poor results
- Increase training data
- Adjust model parameters (hiddenUnits, activation)
- Check data quality and formatting

### Slow performance
- Reduce hiddenUnits
- Use smaller maxLen for text
- Consider using Web Workers for training

---

## Next Steps

1. **Experiment:** Modify the examples to match your use case
2. **Integrate:** Copy code into your application
3. **Extend:** Combine multiple examples for complex features
4. **Learn:** Read the detailed comments to understand the concepts

---

## Support

For questions or issues:
- Check the main [README.md](../../README.md)
- Review the [CODE-WALKTHROUGH.md](../../CODE-WALKTHROUGH.md)
- Explore the [documentation](../../docs/)

---

**Happy coding! 🚀**




