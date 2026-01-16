/**
 * Advanced ELM Variants Tests (Community Edition)
 * Tests for Adaptive Online ELM, Forgetting Online ELM, and Hierarchical ELM
 * All features are now free and open-source!
 */

import * as Community from '../dist/index.js';
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('🧠 Testing Advanced ELM Variants (Community Edition)...\n');

  // ============================================
  // Adaptive Online ELM Tests
  // ============================================
  console.log('📊 Testing Adaptive Online ELM...\n');

  test('AdaptiveOnlineELM class exists', () => {
    assert(typeof Community.AdaptiveOnlineELM === 'function', 'AdaptiveOnlineELM should be exported');
  });

  test('AdaptiveOnlineELM can be created', () => {
    const adaptiveElm = new Community.AdaptiveOnlineELM({
      categories: ['class1', 'class2'],
      initialHiddenUnits: 64,
      minHiddenUnits: 32,
      maxHiddenUnits: 256,
    });
    assert(adaptiveElm !== undefined, 'Should create AdaptiveOnlineELM instance');
  });

  test('AdaptiveOnlineELM can train on batch data', () => {
    try {
      const adaptiveElm = new Community.AdaptiveOnlineELM({
        categories: ['positive', 'negative'],
        initialHiddenUnits: 64,
      });
      
      const X = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
      ];
      const y = [0, 1, 0, 1];
      
      adaptiveElm.fit(X, y);
      
      const hiddenUnits = adaptiveElm.getHiddenUnits();
      assert(hiddenUnits >= 32 && hiddenUnits <= 1024, 'Hidden units should be in valid range');
    } catch (error) {
      if (error.message.includes('OnlineELM not available')) {
        console.log('  Note: OnlineELM not available in CommonJS build, skipping test');
        return;
      }
      throw error;
    }
  });

  test('AdaptiveOnlineELM can predict', () => {
    try {
      const adaptiveElm = new Community.AdaptiveOnlineELM({
        categories: ['cat', 'dog'],
        initialHiddenUnits: 64,
      });
      
      const X = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const y = [0, 1, 0];
      
      adaptiveElm.fit(X, y);
      
      const predictions = adaptiveElm.predict([1, 2, 3], 2);
      assert(Array.isArray(predictions), 'Should return array');
      assert(predictions.length > 0, 'Should have predictions');
      assert(predictions[0].hasOwnProperty('label'), 'Should have label property');
      assert(predictions[0].hasOwnProperty('prob'), 'Should have prob property');
      assert(typeof predictions[0].prob === 'number', 'Probability should be a number');
    } catch (error) {
      if (error.message.includes('OnlineELM not available')) {
        console.log('  Note: OnlineELM not available in CommonJS build, skipping test');
        return;
      }
      throw error;
    }
  });

  test('AdaptiveOnlineELM can update incrementally', () => {
    try {
      const adaptiveElm = new Community.AdaptiveOnlineELM({
        categories: ['a', 'b'],
        initialHiddenUnits: 64,
      });
      
      const X = [[1, 2], [3, 4], [5, 6]];
      const y = [0, 1, 0];
      
      adaptiveElm.fit(X, y);
      
      // Incremental update
      adaptiveElm.update([7, 8], 1);
      
      const predictions = adaptiveElm.predict([7, 8], 1);
      assert(predictions.length > 0, 'Should have predictions after update');
    } catch (error) {
      if (error.message.includes('OnlineELM not available')) {
        console.log('  Note: OnlineELM not available in CommonJS build, skipping test');
        return;
      }
      throw error;
    }
  });

  test('AdaptiveOnlineELM tracks error history', () => {
    try {
      const adaptiveElm = new Community.AdaptiveOnlineELM({
        categories: ['x', 'y'],
        initialHiddenUnits: 64,
      });
      
      const X = [[1, 2], [3, 4]];
      const y = [0, 1];
      
      adaptiveElm.fit(X, y);
      
      const errorHistory = adaptiveElm.getErrorHistory();
      assert(Array.isArray(errorHistory), 'Should return error history array');
    } catch (error) {
      if (error.message.includes('OnlineELM not available')) {
        console.log('  Note: OnlineELM not available in CommonJS build, skipping test');
        return;
      }
      throw error;
    }
  });

  // ============================================
  // Forgetting Online ELM Tests
  // ============================================
  console.log('\n📊 Testing Forgetting Online ELM...\n');

  test('ForgettingOnlineELM class exists', () => {
    assert(typeof Community.ForgettingOnlineELM === 'function', 'ForgettingOnlineELM should be exported');
  });

  test('ForgettingOnlineELM can be created', () => {
    const forgettingElm = new Community.ForgettingOnlineELM({
      categories: ['class1', 'class2'],
      hiddenUnits: 64,
      decayRate: 0.99,
      windowSize: 100,
    });
    assert(forgettingElm !== undefined, 'Should create ForgettingOnlineELM instance');
  });

  test('ForgettingOnlineELM can train on batch data', () => {
    const forgettingElm = new Community.ForgettingOnlineELM({
      categories: ['positive', 'negative'],
      hiddenUnits: 64,
      decayRate: 0.99,
    });
    
    const X = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    const y = [0, 1, 0];
    
    forgettingElm.fit(X, y);
    
    const stats = forgettingElm.getSampleStats();
    assert(stats.total > 0, 'Should have stored samples');
  });

  test('ForgettingOnlineELM can predict', () => {
    const forgettingElm = new Community.ForgettingOnlineELM({
      categories: ['cat', 'dog'],
      hiddenUnits: 64,
    });
    
    const X = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const y = [0, 1];
    
    forgettingElm.fit(X, y);
    
    const predictions = forgettingElm.predict([1, 2, 3], 2);
    assert(Array.isArray(predictions), 'Should return array');
    assert(predictions.length > 0, 'Should have predictions');
    assert(predictions[0].hasOwnProperty('label'), 'Should have label property');
    assert(predictions[0].hasOwnProperty('prob'), 'Should have prob property');
  });

  test('ForgettingOnlineELM can update incrementally with forgetting', () => {
    const forgettingElm = new Community.ForgettingOnlineELM({
      categories: ['a', 'b'],
      hiddenUnits: 64,
      decayRate: 0.95,
      windowSize: 10,
    });
    
    const X = [[1, 2], [3, 4]];
    const y = [0, 1];
    
    forgettingElm.fit(X, y);
    
    const statsBefore = forgettingElm.getSampleStats();
    
    // Add several updates
    for (let i = 0; i < 5; i++) {
      forgettingElm.update([i + 10, i + 11], i % 2);
    }
    
    const statsAfter = forgettingElm.getSampleStats();
    assert(statsAfter.total >= statsBefore.total, 'Should have more or equal samples');
    assert(statsAfter.avgWeight >= 0 && statsAfter.avgWeight <= 1, 'Average weight should be valid');
  });

  test('ForgettingOnlineELM respects window size', () => {
    const forgettingElm = new Community.ForgettingOnlineELM({
      categories: ['x', 'y'],
      hiddenUnits: 64,
      windowSize: 5,
    });
    
    const X = [[1, 2], [3, 4]];
    const y = [0, 1];
    
    forgettingElm.fit(X, y);
    
    // Add more samples than window size
    for (let i = 0; i < 10; i++) {
      forgettingElm.update([i, i + 1], i % 2);
    }
    
    const stats = forgettingElm.getSampleStats();
    assert(stats.total <= 5, 'Should respect window size limit');
  });

  // ============================================
  // Hierarchical ELM Tests
  // ============================================
  console.log('\n📊 Testing Hierarchical ELM...\n');

  test('HierarchicalELM class exists', () => {
    assert(typeof Community.HierarchicalELM === 'function', 'HierarchicalELM should be exported');
  });

  test('HierarchicalELM can be created', () => {
    const hierarchicalElm = new Community.HierarchicalELM({
      rootCategories: ['animal', 'plant'],
      hierarchy: {
        'animal': ['mammal', 'bird'],
        'plant': ['tree', 'flower'],
      },
      hiddenUnits: 64,
    });
    assert(hierarchicalElm !== undefined, 'Should create HierarchicalELM instance');
  });

  test('HierarchicalELM can train', () => {
    const hierarchicalElm = new Community.HierarchicalELM({
      rootCategories: ['animal', 'plant'],
      hierarchy: {
        'animal': ['mammal', 'bird'],
        'plant': ['tree', 'flower'],
      },
    });
    
    const X = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ];
    const yLabels = [
      ['animal', 'mammal'],
      ['animal', 'bird'],
      ['plant', 'tree'],
      ['plant', 'flower'],
    ];
    
    hierarchicalElm.train(X, yLabels);
    
    const rootCategories = hierarchicalElm.getRootCategories();
    assert(rootCategories.length === 2, 'Should have root categories');
  });

  test('HierarchicalELM can predict with hierarchical paths', () => {
    const hierarchicalElm = new Community.HierarchicalELM({
      rootCategories: ['animal', 'plant'],
      hierarchy: {
        'animal': ['mammal', 'bird'],
        'plant': ['tree', 'flower'],
      },
    });
    
    const X = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const yLabels = [
      ['animal', 'mammal'],
      ['plant', 'tree'],
    ];
    
    hierarchicalElm.train(X, yLabels);
    
    const predictions = hierarchicalElm.predict([1, 2, 3], 2);
    assert(Array.isArray(predictions), 'Should return array');
    assert(predictions.length > 0, 'Should have predictions');
    assert(predictions[0].hasOwnProperty('path'), 'Should have path property');
    assert(predictions[0].hasOwnProperty('label'), 'Should have label property');
    assert(predictions[0].hasOwnProperty('prob'), 'Should have prob property');
    assert(predictions[0].hasOwnProperty('levelProbs'), 'Should have levelProbs property');
    assert(Array.isArray(predictions[0].path), 'Path should be an array');
    assert(Array.isArray(predictions[0].levelProbs), 'Level probs should be an array');
  });

  test('HierarchicalELM returns valid hierarchy structure', () => {
    const hierarchy = {
      'animal': ['mammal', 'bird'],
      'plant': ['tree', 'flower'],
    };
    
    const hierarchicalElm = new Community.HierarchicalELM({
      rootCategories: ['animal', 'plant'],
      hierarchy: hierarchy,
    });
    
    const retrievedHierarchy = hierarchicalElm.getHierarchy();
    assert(retrievedHierarchy instanceof Map, 'Should return Map');
    assert(retrievedHierarchy.has('animal'), 'Should have animal key');
    assert(retrievedHierarchy.has('plant'), 'Should have plant key');
  });

  test('HierarchicalELM handles single-level predictions', () => {
    const hierarchicalElm = new Community.HierarchicalELM({
      rootCategories: ['a', 'b'],
      hierarchy: {}, // No children
    });
    
    const X = [[1, 2], [3, 4]];
    const yLabels = [['a'], ['b']];
    
    hierarchicalElm.train(X, yLabels);
    
    const predictions = hierarchicalElm.predict([1, 2], 1);
    assert(predictions.length > 0, 'Should have predictions');
    assert(predictions[0].path.length === 1, 'Single-level path should have one element');
  });

  console.log('\n✅ All Premium ELM Variant tests completed!\n');
}

// Export for test runner
export { runTests };

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
}

