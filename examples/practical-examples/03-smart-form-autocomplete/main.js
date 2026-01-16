/**
 * ============================================================================
 * SMART FORM AUTOCOMPLETE - Practical Example for Front-End Developers
 * ============================================================================
 * 
 * PROBLEM:
 * Front-end developers need to implement intelligent autocomplete for forms
 * that:
 * - Learns from user input patterns
 * - Provides context-aware suggestions
 * - Works without server round-trips
 * - Adapts to individual users over time
 * - Handles various field types (names, emails, addresses, etc.)
 * 
 * Traditional approaches:
 * - Static dropdown lists (limited, not personalized)
 * - Server-side autocomplete APIs (latency, cost, privacy)
 * - Browser's built-in autocomplete (not customizable)
 * 
 * SOLUTION:
 * Use AsterMind ELM to create field-specific autocomplete models that:
 * - Learn from user input history
 * - Provide semantic suggestions (not just prefix matching)
 * - Work entirely client-side
 * - Can be personalized per user
 * - Adapt in real-time
 * 
 * HOW IT WORKS:
 * 
 *     User Types
 *         |
 *         v
 *     [Partial Input] --> [ELM Autocomplete Model]
 *         |                      |
 *         |                      v
 *         |              [Generate Suggestions]
 *         |                      |
 *         v                      v
 *     [Display Top K] <-- [Rank by Relevance]
 * 
 * ARCHITECTURE DIAGRAM:
 * 
 *     ┌──────────────┐
 *     │  User Input  │
 *     │  (Partial)   │
 *     └──────┬───────┘
 *            │
 *            v
 *     ┌──────────────┐      ┌─────────────┐
 *     │ Field-Specific│─────>│  Autocomplete│
 *     │  ELM Model   │      │   Model     │
 *     └──────────────┘      └──────┬──────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Generate       │
 *                          │  Completions    │
 *                          └────────┬────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Rank & Filter  │
 *                          │  (Top K)        │
 *                          └────────┬────────┘
 *                                   │
 *                                   v
 *                          ┌─────────────────┐
 *                          │  Display        │
 *                          │  Suggestions    │
 *                          └─────────────────┘
 * 
 * TRAINING:
 * Models are trained on historical input data for each field.
 * As users submit forms, new data is added to improve suggestions.
 * 
 * USAGE:
 * 1. Initialize autocomplete models for each field
 * 2. Train on existing data (or start empty and learn over time)
 * 3. As user types, generate and display suggestions
 * 4. When form is submitted, add new data to training set
 * 
 * PERFORMANCE:
 * - Training: ~50-200ms per field
 * - Suggestion generation: <5ms per keystroke
 * - Memory: ~500KB-2MB per field model
 * 
 * ============================================================================
 */

// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713

const { AutoComplete } = window.astermind;

// ============================================================================
// TRAINING DATA - Sample data for each field type
// In production, load from localStorage or user history
// ============================================================================

// Sample names for training
const NAME_EXAMPLES = [
    "John Smith",
    "John Doe",
    "John Johnson",
    "Sarah Williams",
    "Sarah Brown",
    "Sarah Davis",
    "Michael Wilson",
    "Michael Taylor",
    "Emily Anderson",
    "Emily Martinez",
    "David Thompson",
    "David Garcia",
    "Jessica White",
    "Jessica Harris",
    "Christopher Lee",
    "Christopher Clark",
];

// Sample email patterns
const EMAIL_EXAMPLES = [
    "john.smith@example.com",
    "john.doe@company.com",
    "sarah.williams@email.com",
    "sarah.brown@test.com",
    "michael.wilson@domain.com",
    "emily.anderson@mail.com",
    "david.thompson@corp.com",
    "jessica.white@site.com",
];

// Sample company names
const COMPANY_EXAMPLES = [
    "Tech Solutions Inc",
    "Tech Corp",
    "Tech Innovations",
    "Design Studio",
    "Design Agency",
    "Design Co",
    "Software Systems",
    "Software Solutions",
    "Digital Media",
    "Digital Works",
    "Creative Labs",
    "Creative Studio",
];

// Sample job titles
const JOB_EXAMPLES = [
    "Software Developer",
    "Senior Developer",
    "Frontend Developer",
    "Backend Developer",
    "Product Manager",
    "Project Manager",
    "Design Manager",
    "UX Designer",
    "UI Designer",
    "Marketing Manager",
    "Sales Manager",
    "Operations Manager",
];

// ============================================================================
// AUTocomplete MODELS
// ============================================================================

const autocompleteModels = {
    name: null,
    email: null,
    company: null,
    job: null,
};

let isReady = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize autocomplete model for a specific field
 * @param {string} fieldName - Name of the field (e.g., 'name', 'email')
 * @param {Array<string>} examples - Training examples for this field
 * @returns {AutoComplete} Initialized autocomplete model
 */
function initializeAutocomplete(fieldName, examples) {
    console.log(`🔧 Initializing ${fieldName} autocomplete...`);
    
    // Create training pairs for autocomplete
    // Format: { input: partial_text, label: full_completion }
    const trainingPairs = [];
    
    examples.forEach(example => {
        // For each example, create multiple training pairs
        // representing different partial inputs
        for (let i = 1; i < example.length; i++) {
            const partial = example.slice(0, i);
            const completion = example.slice(i); // What comes after the partial
            
            trainingPairs.push({
                input: partial.toLowerCase(),
                label: completion.toLowerCase(),
            });
        }
    });
    
    console.log(`   Created ${trainingPairs.length} training pairs from ${examples.length} examples`);
    
    // Get the actual input and output elements for this field
    const inputElement = document.getElementById(`${fieldName}Input`);
    const outputElement = document.getElementById(`${fieldName}Suggestions`);
    
    if (!inputElement || !outputElement) {
        throw new Error(`Missing elements for field: ${fieldName}`);
    }
    
    // Create AutoComplete model
    const model = new AutoComplete(trainingPairs, {
        inputElement: inputElement,
        outputElement: outputElement,
        hiddenUnits: 64, // Smaller model for faster inference
        activation: 'relu',
        metrics: {
            accuracy: 0.7, // Lower threshold for autocomplete
        },
    });
    
    // Train the model
    const startTime = performance.now();
    model.train();
    const trainTime = performance.now() - startTime;
    
    console.log(`✅ ${fieldName} autocomplete ready in ${trainTime.toFixed(2)}ms`);
    
    return model;
}

/**
 * Initialize all autocomplete models
 */
async function initializeAllAutocompletes() {
    console.log('🚀 Initializing all autocomplete models...');
    
    // Initialize each field's autocomplete model
    autocompleteModels.name = initializeAutocomplete('name', NAME_EXAMPLES);
    autocompleteModels.email = initializeAutocomplete('email', EMAIL_EXAMPLES);
    autocompleteModels.company = initializeAutocomplete('company', COMPANY_EXAMPLES);
    autocompleteModels.job = initializeAutocomplete('job', JOB_EXAMPLES);
    
    isReady = true;
    console.log('✅ All autocomplete models ready!');
}

/**
 * Get suggestions for a field
 * @param {string} fieldName - Name of the field
 * @param {string} input - Current input value
 * @param {number} topK - Number of suggestions to return
 * @returns {Array} Array of suggestion objects
 */
function getSuggestions(fieldName, input, topK = 5) {
    if (!isReady || !input.trim()) {
        return [];
    }
    
    const model = autocompleteModels[fieldName];
    if (!model) {
        return [];
    }
    
    // Get predictions from the autocomplete model
    // AutoComplete.predict returns { completion, prob }
    const predictions = model.predict(input.toLowerCase(), topK);
    
    // Format suggestions
    return predictions.map(pred => {
        const completion = pred.completion || '';
        const fullText = input + completion;
        
        return {
            text: fullText,
            completion: completion,
            confidence: pred.prob || 0,
        };
    });
}

/**
 * Render suggestions to the DOM
 * @param {string} fieldName - Name of the field
 * @param {Array} suggestions - Array of suggestion objects
 */
function renderSuggestions(fieldName, suggestions) {
    const suggestionsEl = document.getElementById(`${fieldName}Suggestions`);
    if (!suggestionsEl) return;
    
    // Clear previous suggestions
    suggestionsEl.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsEl.classList.remove('show');
        return;
    }
    
    // Show suggestions container
    suggestionsEl.classList.add('show');
    
    // Render each suggestion
    suggestions.forEach((suggestion, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'suggestion-item';
        itemEl.dataset.index = index;
        
        // Highlight the matched portion
        const inputLength = document.getElementById(`${fieldName}Input`).value.length;
        const matchedText = suggestion.text.slice(0, inputLength);
        const completionText = suggestion.text.slice(inputLength);
        
        itemEl.innerHTML = `
            <div class="suggestion-text">
                <span>${matchedText}</span>
                <span class="suggestion-match">${completionText}</span>
            </div>
            <div class="suggestion-hint">
                Confidence: ${Math.round(suggestion.confidence * 100)}%
            </div>
        `;
        
        // Click handler
        itemEl.addEventListener('click', () => {
            selectSuggestion(fieldName, suggestion.text);
        });
        
        suggestionsEl.appendChild(itemEl);
    });
}

/**
 * Select a suggestion and fill the input
 * @param {string} fieldName - Name of the field
 * @param {string} text - Selected suggestion text
 */
function selectSuggestion(fieldName, text) {
    const inputEl = document.getElementById(`${fieldName}Input`);
    if (inputEl) {
        inputEl.value = text;
        inputEl.focus();
        
        // Hide suggestions
        const suggestionsEl = document.getElementById(`${fieldName}Suggestions`);
        if (suggestionsEl) {
            suggestionsEl.classList.remove('show');
        }
        
        // Trigger input event to update form state
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Handle keyboard navigation in suggestions
 * @param {string} fieldName - Name of the field
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleSuggestionNavigation(fieldName, event) {
    const suggestionsEl = document.getElementById(`${fieldName}Suggestions`);
    if (!suggestionsEl || !suggestionsEl.classList.contains('show')) {
        return;
    }
    
    const items = suggestionsEl.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    const selected = suggestionsEl.querySelector('.suggestion-item.selected');
    let selectedIndex = selected ? parseInt(selected.dataset.index) : -1;
    
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection(items, selectedIndex);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
        updateSelection(items, selectedIndex);
    } else if (event.key === 'Enter' && selected) {
        event.preventDefault();
        const text = selected.querySelector('.suggestion-text').textContent.trim();
        selectSuggestion(fieldName, text);
    } else if (event.key === 'Escape') {
        suggestionsEl.classList.remove('show');
    }
}

/**
 * Update selected suggestion item
 */
function updateSelection(items, index) {
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
    
    // Scroll into view
    if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Setup input handlers for each field
const fields = ['name', 'email', 'company', 'job'];

fields.forEach(fieldName => {
    const inputEl = document.getElementById(`${fieldName}Input`);
    if (!inputEl) return;
    
    let suggestionTimeout = null;
    
    // Handle input
    inputEl.addEventListener('input', (e) => {
        const input = e.target.value;
        
        // Clear previous timeout
        if (suggestionTimeout) {
            clearTimeout(suggestionTimeout);
        }
        
        // Debounce: show suggestions 100ms after user stops typing
        suggestionTimeout = setTimeout(() => {
            if (!isReady) return;
            
            const suggestions = getSuggestions(fieldName, input);
            renderSuggestions(fieldName, suggestions);
        }, 100);
    });
    
    // Handle keyboard navigation
    inputEl.addEventListener('keydown', (e) => {
        handleSuggestionNavigation(fieldName, e);
    });
    
    // Hide suggestions when clicking outside
    inputEl.addEventListener('blur', () => {
        // Delay to allow click events on suggestions
        setTimeout(() => {
            const suggestionsEl = document.getElementById(`${fieldName}Suggestions`);
            if (suggestionsEl) {
                suggestionsEl.classList.remove('show');
            }
        }, 200);
    });
    
    // Show suggestions on focus if there's input
    inputEl.addEventListener('focus', () => {
        if (inputEl.value.trim() && isReady) {
            const suggestions = getSuggestions(fieldName, inputEl.value);
            renderSuggestions(fieldName, suggestions);
        }
    });
});

// Handle form submission
document.getElementById('demoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('nameInput').value,
        email: document.getElementById('emailInput').value,
        company: document.getElementById('companyInput').value,
        job: document.getElementById('jobInput').value,
    };
    
    console.log('📝 Form submitted:', formData);
    
    // In production, you would:
    // 1. Save form data
    // 2. Add new data to training examples
    // 3. Retrain models periodically with new data
    
    alert('Form submitted! (Check console for data)\n\nIn production, this would save the data and update the autocomplete models.');
});

// Handle demo button clicks
document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-field');
        const value = btn.getAttribute('data-value');
        
        const inputEl = document.getElementById(`${field}Input`);
        if (inputEl) {
            inputEl.value = value;
            inputEl.focus();
            
            // Trigger input event
            const event = new Event('input', { bubbles: true });
            inputEl.dispatchEvent(event);
        }
    });
});

// ============================================================================
// STARTUP
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeAllAutocompletes();
    } catch (error) {
        console.error('❌ Initialization error:', error);
        alert('Failed to initialize autocomplete: ' + error.message);
    }
});




