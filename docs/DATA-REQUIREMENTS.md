# Content Moderation Model - Data Requirements Guide

## Current Training Data

Based on the current implementation:
- **Safe examples**: ~50 examples
- **Warning examples**: ~45 examples  
- **Unsafe examples**: ~63 examples
- **Total**: ~158 examples

## Data Requirements for Generalization

### Minimum Viable (Basic Functionality)
**~30-50 examples per class** (90-150 total)
- Works for simple, clear-cut cases
- May struggle with edge cases and variations
- Good for proof-of-concept or demos
- **Current status**: ✅ You're at this level

### Recommended (Good Generalization)
**~100-200 examples per class** (300-600 total)
- Handles most common patterns and variations
- Better at distinguishing similar content
- More robust to edge cases
- Suitable for production use with monitoring

### Optimal (Excellent Generalization)
**~500-1000+ examples per class** (1500-3000+ total)
- Handles nuanced cases and rare patterns
- Very robust to variations in phrasing
- Can learn subtle distinctions
- Production-ready with high confidence

## Factors Affecting Generalization

### 1. **Data Diversity** (More Important Than Quantity)
- **Vocabulary variety**: Different words, phrases, slang
- **Length variation**: Short phrases, long sentences
- **Context variety**: Different topics, domains, styles
- **Edge cases**: Borderline examples that test boundaries

### 2. **Data Quality**
- **Clear labeling**: Consistent, accurate category assignments
- **Representative samples**: Examples match real-world usage
- **Balanced classes**: Roughly equal examples per category

### 3. **Model Characteristics**
ELM models are relatively data-efficient because:
- ✅ Single-layer architecture (less prone to overfitting)
- ✅ Random feature mapping (generalizes well)
- ✅ Closed-form solution (no iterative optimization issues)

However, they still need:
- ⚠️ Enough examples to cover the feature space
- ⚠️ Diverse patterns to learn robust representations

### 4. **Task Complexity**
For content moderation:
- **Simple**: Clear profanity vs. polite language → ~50-100 examples per class
- **Moderate**: Distinguishing safe/warning/unsafe → ~100-200 examples per class
- **Complex**: Nuanced context, sarcasm, cultural differences → ~500+ examples per class

## Recommendations for Your Model

### Short-term (Improve Current Model)
1. **Expand to ~100 examples per class** (300 total)
   - Add more variations of existing patterns
   - Include more edge cases
   - Add domain-specific examples

2. **Focus on diversity**:
   - Different sentence structures
   - Various lengths (short phrases to long sentences)
   - Different topics/contexts
   - Slang, abbreviations, misspellings

3. **Strengthen weak areas**:
   - More profanity variations (you've added these ✅)
   - More borderline warning examples
   - More subtle safe examples that might be confused

### Medium-term (Production-Ready)
1. **Collect real-world data**:
   - Use actual user comments/posts (anonymized)
   - Include false positives/negatives from testing
   - Add edge cases you discover

2. **Aim for ~200-300 examples per class** (600-900 total):
   - Better generalization
   - More robust to variations
   - Handles edge cases better

3. **Continuous improvement**:
   - Monitor model performance
   - Add examples for misclassifications
   - Retrain periodically with new data

## Data Collection Strategies

### 1. **Synthetic Generation**
- Use templates with variations
- Paraphrase existing examples
- Add noise/variations to good examples

### 2. **Real-World Collection**
- User-generated content (with consent)
- Public datasets (e.g., Jigsaw Toxic Comment Classification)
- Manual curation from forums/social media

### 3. **Active Learning**
- Test model on new examples
- Identify misclassifications
- Add those to training set
- Retrain and iterate

## ELM-Specific Considerations

### Advantages (Data-Efficient)
- ✅ Single-layer = less overfitting risk
- ✅ Random features = good generalization
- ✅ Fast training = easy to iterate

### Considerations
- ⚠️ Needs diverse examples to cover feature space
- ⚠️ Character-level encoding captures patterns well
- ⚠️ Hidden units (512) can handle more data

### Current Model Settings
- **Hidden units**: 512 (good capacity)
- **Regularization**: 0.01 (balanced)
- **Activation**: tanh (good for learning)
- **Sample weighting**: Used for warning/unsafe (helps with imbalance)

## Quick Wins to Improve Generalization

1. **Add variations** of existing examples:
   - Change word order
   - Add/remove words
   - Use synonyms
   - Different punctuation

2. **Add edge cases**:
   - Sarcasm examples
   - Polite but negative feedback
   - Strong language in safe contexts (rare but possible)

3. **Balance classes**:
   - Ensure roughly equal examples per class
   - Use sample weighting for important examples

4. **Test and iterate**:
   - Test on new examples
   - Add misclassified examples to training
   - Monitor accuracy on validation set

## Expected Performance by Data Size

| Examples/Class | Total | Expected Accuracy | Use Case |
|---------------|-------|-------------------|----------|
| 30-50 | 90-150 | 70-80% | Demo, POC |
| 100-200 | 300-600 | 85-92% | Production (monitored) |
| 500-1000 | 1500-3000 | 92-96% | Production (high confidence) |

*Note: Accuracy depends heavily on data quality and diversity, not just quantity.*

## Conclusion

**Current status**: You have ~158 examples (~50/45/63 per class), which is at the minimum viable level.

**For better generalization**: Aim for **~100-200 examples per class** (300-600 total) with high diversity. This should give you **85-92% accuracy** in production.

**Priority**: Focus on **data diversity** and **edge cases** rather than just increasing quantity. Quality and variety matter more than raw numbers.


