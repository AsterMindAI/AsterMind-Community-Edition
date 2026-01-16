// © 2026 AsterMind AI Co. – All Rights Reserved.
// Patent Pending US 63/897,713
// Tests for practical examples

import { describe, it, expect, beforeAll } from 'vitest';
import { ELM, EmbeddingStore, UniversalEncoder, AutoComplete } from '../src/index';

describe('Practical Examples Tests', () => {
    describe('01-smart-search-filtering', () => {
        it('should initialize encoder and create embeddings', async () => {
            // Use character-level encoding for consistent vector sizes
            const textEncoder = new UniversalEncoder({
                charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
                maxLen: 50,
                useTokenizer: false, // Character-level for consistent sizes
            });

            const encoder = new ELM({
                categories: ['product1', 'product2'],
                hiddenUnits: 64,
                maxLen: 50,
                useTokenizer: false, // Character-level
                encoder: textEncoder,
                activation: 'relu',
                weightInit: 'xavier',
                ridgeLambda: 0.01,
            });

            // Training data
            const trainingTexts = [
                'wireless bluetooth headphones',
                'smart fitness tracker',
                'portable phone charger',
            ];

            const X = [];
            const Y = [];

            // Ensure all vectors have the same size
            const vectorSize = textEncoder.getVectorSize();

            for (let i = 0; i < trainingTexts.length; i++) {
                const vec = textEncoder.normalize(textEncoder.encode(trainingTexts[i]));
                // Pad or truncate to ensure consistent size
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(encoder.oneHot(2, i % 2));
            }

            encoder.trainFromData(X, Y);

            expect(encoder.model).toBeTruthy();

            // Test embedding generation
            const testText = 'wireless headphones';
            const testVec = textEncoder.normalize(textEncoder.encode(testText));
            const vectorSizeForTest = textEncoder.getVectorSize();
            const paddedTestVec = testVec.slice(0, vectorSizeForTest).concat(new Array(Math.max(0, vectorSizeForTest - testVec.length)).fill(0));
            const embeddingBatch = encoder.getEmbedding([paddedTestVec]);
            expect(Array.isArray(embeddingBatch)).toBe(true);
            expect(embeddingBatch.length).toBeGreaterThan(0);
            const embedding = embeddingBatch[0];
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(64);
            expect(embedding.every(v => typeof v === 'number')).toBe(true);

            // Test EmbeddingStore - ensure vector is a proper array
            const embeddingArray = Array.from(embedding); // Ensure it's a plain array
            const store = new EmbeddingStore(64, { capacity: 100, storeUnit: true });
            store.add({
                id: 'test1',
                vec: embeddingArray,
                meta: { title: 'Test Product' },
            });

            const results = store.query(
                embeddingArray, // Query vector (first parameter)
                1, // k
                { metric: 'cosine' } // Options
            );

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].id).toBe('test1');
        });
    });

    describe('02-content-moderation', () => {
        it('should train classifier and classify content', async () => {
            // Use character-level encoding for consistent vector sizes
            const textEncoder = new UniversalEncoder({
                charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
                maxLen: 50,
                useTokenizer: false, // Character-level for consistent sizes
            });

            const classifier = new ELM({
                categories: ['safe', 'unsafe'],
                hiddenUnits: 64,
                maxLen: 50,
                useTokenizer: false, // Character-level
                encoder: textEncoder,
                activation: 'relu',
                weightInit: 'xavier',
                ridgeLambda: 0.01,
            });

            // Training data
            const safeExamples = ['This is great!', 'Thank you for your help.'];
            const unsafeExamples = ['You are an idiot', 'This is garbage'];

            const X = [];
            const Y = [];

            // Ensure all vectors have the same size
            const vectorSize = textEncoder.getVectorSize();
            
            safeExamples.forEach(text => {
                const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
                // Pad or truncate to ensure consistent size
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(classifier.oneHot(2, 0)); // safe
            });

            unsafeExamples.forEach(text => {
                const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
                // Pad or truncate to ensure consistent size
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(classifier.oneHot(2, 1)); // unsafe
            });

            classifier.trainFromData(X, Y);

            expect(classifier.model).toBeTruthy();

            // Test prediction using predictFromVector (since we're using character-level encoding)
            const testVec = textEncoder.normalize(textEncoder.encode('This is great!'.toLowerCase()));
            const paddedTestVec = testVec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - testVec.length)).fill(0));
            const result = classifier.predictFromVector([paddedTestVec]);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].length).toBeGreaterThan(0);
            expect(result[0][0]).toHaveProperty('label');
            expect(result[0][0]).toHaveProperty('prob');
        });
    });

    describe('03-smart-form-autocomplete', () => {
        it('should create and use AutoComplete model', async () => {
            // Create DOM elements for AutoComplete (required by API)
            const inputElement = document.createElement('input');
            const outputElement = document.createElement('div');
            document.body.appendChild(inputElement);
            document.body.appendChild(outputElement);

            const trainingPairs = [
                { input: 'j', label: 'ohn' },
                { input: 'jo', label: 'hn' },
                { input: 'joh', label: 'n' },
                { input: 's', label: 'arah' },
                { input: 'sa', label: 'rah' },
            ];

            const model = new AutoComplete(trainingPairs, {
                inputElement: inputElement,
                outputElement: outputElement,
                hiddenUnits: 32,
                activation: 'relu',
            });

            model.train();

            expect(model.model).toBeTruthy();
            expect((model.model as any).model || (model.model as any).beta).toBeTruthy();

            // Test prediction
            const predictions = model.predict('j', 3);
            expect(Array.isArray(predictions)).toBe(true);
            expect(predictions.length).toBeGreaterThan(0);
            expect(predictions[0]).toHaveProperty('completion');
            expect(predictions[0]).toHaveProperty('prob');

            // Cleanup
            document.body.removeChild(inputElement);
            document.body.removeChild(outputElement);
        });
    });

    describe('04-user-intent-classification', () => {
        it('should train intent classifier and classify intents', async () => {
            // Use character-level encoding for consistent vector sizes
            const textEncoder = new UniversalEncoder({
                charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?-',
                maxLen: 50,
                useTokenizer: false, // Character-level for consistent sizes
            });

            const intents = ['purchase', 'support', 'inquiry'];
            const classifier = new ELM({
                categories: intents,
                hiddenUnits: 64,
                maxLen: 50,
                useTokenizer: false, // Character-level
                encoder: textEncoder,
                activation: 'relu',
                weightInit: 'xavier',
                ridgeLambda: 0.01,
            });

            // Training data
            const purchaseExamples = ['I want to buy this', 'How can I purchase?'];
            const supportExamples = ['I need help', 'How do I reset password?'];
            const inquiryExamples = ['What are your hours?', 'Tell me more'];

            const X = [];
            const Y = [];

            // Ensure all vectors have the same size
            const vectorSize = textEncoder.getVectorSize();

            purchaseExamples.forEach(text => {
                const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(classifier.oneHot(intents.length, intents.indexOf('purchase')));
            });

            supportExamples.forEach(text => {
                const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(classifier.oneHot(intents.length, intents.indexOf('support')));
            });

            inquiryExamples.forEach(text => {
                const vec = textEncoder.normalize(textEncoder.encode(text.toLowerCase()));
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(classifier.oneHot(intents.length, intents.indexOf('inquiry')));
            });

            classifier.trainFromData(X, Y);

            expect(classifier.model).toBeTruthy();

            // Test prediction using predictFromVector (since we're using character-level encoding)
            const testVec = textEncoder.normalize(textEncoder.encode('I want to buy this'.toLowerCase()));
            const paddedTestVec = testVec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - testVec.length)).fill(0));
            const result = classifier.predictFromVector([paddedTestVec]);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].length).toBeGreaterThan(0);
            expect(result[0][0]).toHaveProperty('label');
            expect(result[0][0]).toHaveProperty('prob');
        });
    });

    describe('05-personalized-recommendations', () => {
        it('should create item embeddings and generate recommendations', async () => {
            // Use character-level encoding for consistent vector sizes
            const textEncoder = new UniversalEncoder({
                charSet: 'abcdefghijklmnopqrstuvwxyz0123456789 -',
                maxLen: 50,
                useTokenizer: false, // Character-level for consistent sizes
            });

            const items = [
                { id: 1, title: 'Action Movie', category: 'movies', tags: ['action', 'thriller'] },
                { id: 2, title: 'Comedy Show', category: 'tv', tags: ['comedy', 'funny'] },
                { id: 3, title: 'Sci-Fi Book', category: 'books', tags: ['sci-fi', 'fiction'] },
            ];

            const itemEncoder = new ELM({
                categories: items.map((_, i) => `item-${i}`),
                hiddenUnits: 64,
                maxLen: 50,
                useTokenizer: false, // Character-level
                encoder: textEncoder,
                activation: 'relu',
                weightInit: 'xavier',
                ridgeLambda: 0.01,
            });

            // Training data
            const trainingTexts = items.map(item => {
                const features = `${item.title} ${item.category} ${item.tags.join(' ')}`;
                return features.toLowerCase();
            });

            const X = [];
            const Y = [];

            // Ensure all vectors have the same size
            const vectorSize = textEncoder.getVectorSize();

            trainingTexts.forEach((text, i) => {
                const vec = textEncoder.normalize(textEncoder.encode(text));
                // Pad or truncate to ensure consistent size
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                X.push(paddedVec);
                Y.push(itemEncoder.oneHot(items.length, i));
            });

            itemEncoder.trainFromData(X, Y);

            expect(itemEncoder.model).toBeTruthy();

            // Test embedding generation
            const testFeatures = `${items[0].title} ${items[0].category} ${items[0].tags.join(' ')}`;
            const testVec = textEncoder.normalize(textEncoder.encode(testFeatures.toLowerCase()));
            const embeddingBatch = itemEncoder.getEmbedding([testVec]);

            expect(Array.isArray(embeddingBatch)).toBe(true);
            expect(embeddingBatch.length).toBeGreaterThan(0);
            const embedding = embeddingBatch[0];
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.every(v => typeof v === 'number')).toBe(true);

            // Test EmbeddingStore - ensure vectors are proper arrays
            const store = new EmbeddingStore(64, { capacity: 100, storeUnit: true });
            items.forEach((item, i) => {
                const features = `${item.title} ${item.category} ${item.tags.join(' ')}`;
                const vec = textEncoder.normalize(textEncoder.encode(features.toLowerCase()));
                const paddedVec = vec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - vec.length)).fill(0));
                const embBatch = itemEncoder.getEmbedding([paddedVec]);
                const emb = embBatch[0];
                if (emb && Array.isArray(emb) && emb.every(v => typeof v === 'number')) {
                    // Ensure it's a plain array, not a typed array
                    const embArray = Array.from(emb);
                    store.add({
                        id: `item-${item.id}`,
                        vec: embArray,
                        meta: item,
                    });
                }
            });

            expect(store.size()).toBeGreaterThan(0);

            // Test query
            const queryText = 'action movie';
            const queryVec = textEncoder.normalize(textEncoder.encode(queryText.toLowerCase()));
            const paddedQueryVec = queryVec.slice(0, vectorSize).concat(new Array(Math.max(0, vectorSize - queryVec.length)).fill(0));
            const queryEmb = itemEncoder.getEmbedding([paddedQueryVec]);
            const queryEmbedding = queryEmb[0];
            if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.every(v => typeof v === 'number')) {
                // Ensure it's a plain array
                const queryArray = Array.from(queryEmbedding);
                const results = store.query(
                    queryArray, // Query vector (first parameter)
                    2, // k
                    { metric: 'cosine' } // Options
                );

                expect(results.length).toBeGreaterThan(0);
            }
        });
    });
});


