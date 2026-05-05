import { describe, it, expect } from 'vitest';
import { EmbeddingStore } from '../src/index';

describe('EmbeddingStore — smoke tests', () => {
    it('constructs with valid dim; rejects invalid dim', () => {
        const store = new EmbeddingStore(3);
        expect(store.size()).toBe(0);
        expect(store.dimension()).toBe(3);

        expect(() => new EmbeddingStore(0)).toThrow();
        expect(() => new EmbeddingStore(-1)).toThrow();
    });

    it('add + size + has + get', () => {
        const store = new EmbeddingStore(3);
        store.add({ id: 'a', vec: [1, 0, 0] });
        store.add({ id: 'b', vec: [0, 1, 0], meta: { kind: 'axis' } });

        expect(store.size()).toBe(2);
        expect(store.has('a')).toBe(true);
        expect(store.has('b')).toBe(true);
        expect(store.has('z')).toBe(false);

        const a = store.get('a');
        expect(a).toBeDefined();
        expect(a?.id).toBe('a');
    });

    it('cosine query returns the most-aligned id', () => {
        const store = new EmbeddingStore(3);
        store.add({ id: 'right', vec: [1, 0, 0] });
        store.add({ id: 'up', vec: [0, 1, 0] });
        store.add({ id: 'forward', vec: [0, 0, 1] });

        const hits = store.query([0.9, 0.1, 0.0], 1, { metric: 'cosine' });
        expect(hits.length).toBe(1);
        expect(hits[0].id).toBe('right');
        expect(hits[0]).toHaveProperty('score');
    });

    it('capacity ring buffer evicts oldest', () => {
        const store = new EmbeddingStore(2, { capacity: 2 });
        store.add({ id: 'a', vec: [1, 0] });
        store.add({ id: 'b', vec: [0, 1] });
        store.add({ id: 'c', vec: [1, 1] });

        expect(store.size()).toBe(2);
        expect(store.has('a')).toBe(false);
        expect(store.has('c')).toBe(true);
    });

    it('add of duplicate id throws (use upsert instead)', () => {
        const store = new EmbeddingStore(2);
        store.add({ id: 'dup', vec: [1, 0] });
        expect(() => store.add({ id: 'dup', vec: [0, 1] })).toThrow();
    });

    it('query rejects vectors of wrong dim', () => {
        const store = new EmbeddingStore(3);
        store.add({ id: 'a', vec: [1, 0, 0] });
        expect(() => store.query([1, 0], 1)).toThrow();
    });
});
