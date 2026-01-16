// OmegaSumDet.ts — Deterministic, context-locked summarizer (v2.2)
// -----------------------------------------------------------------------------
// Goals
// - ONLY summarize from the already-kept, top-ranked chunks (no leakage).
// - Deterministic ordering, scoring, and composition.
// - Stable weighting with explicit, normalized features.
// - Code is treated as atomic and only included when query-aligned.
// - Section diversity is capped to keep answers focused.
// - Scored, stemmed, stopword-aware heading alignment (Dice) + small intent & RR boosts.
// - Intent-aware code gating (e.g., require `func` for "define function" queries).
// -----------------------------------------------------------------------------

// License removed - all features are now free!

export type ScoredChunk = {
    heading: string;
    content: string;     // plain text (rich optional; code fences can be in either)
    rich?: string;
    level?: number;
    secId?: number;
    rrScore?: number;    // reranker score (higher = better)
    rrRank?: number;     // 0-based reranker rank (lower = better)
};

export type SumOptions = {
    // Output shaping
    maxAnswerChars?: number;         // default 900
    maxBullets?: number;             // default 6
    preferCode?: boolean;            // default true → eligible code gets a small bonus
    includeCitations?: boolean;      // default true
    addFooter?: boolean;             // default true

    // Weights (features are normalized to [0,1] before applying)
    teWeight?: number;               // default 0.25
    queryWeight?: number;            // default 0.45
    evidenceWeight?: number;         // default 0.20
    rrWeight?: number;               // default 0.10

    // Bonuses / penalties
    codeBonus?: number;              // default +0.05 (applied only when query-aligned)
    headingBonus?: number;           // default +0.04 scaled by alignment

    // Thresholds & gates
    jaccardDedupThreshold?: number;  // default 0.6 (0..1)
    allowOffTopic?: boolean;         // default false — do not include off-topic headings
    minQuerySimForCode?: number;     // default 0.40 (post-normalization)
    maxSectionsInAnswer?: number;    // default 1
    focusTopAlignedHeadings?: number;// default 2 — build candidates from top-N aligned headings
};

type Candidate = {
    sent: string;        // sentence text (or fenced code block as an atomic "sentence")
    chunkIdx: number;    // index into kept array
    sentIdx: number;     // ordinal in original chunk traversal
    heading: string;
    hasCode: boolean;
    features: {
        querySim: number;      // [0,1] after normalization
        teGain: number;        // [0,1] after normalization
        evidence: number;      // [0,1] after normalization
        rr: number;            // [0,1] after normalization
        headingAligned: boolean;   // local sentence↔heading (stemmed Dice >= 0.15)
        codeRelevance: number;     // raw [0,1] (fraction overlap), not normalized
    };
    score: number;        // final combined score (after bonuses)
};

const DEFAULTS: Required<SumOptions> = {
    maxAnswerChars: 900,
    maxBullets: 6,
    preferCode: true,
    includeCitations: true,
    addFooter: true,

    teWeight: 0.25,
    queryWeight: 0.45,
    evidenceWeight: 0.20,
    rrWeight: 0.10,

    codeBonus: 0.05,
    headingBonus: 0.04,

    jaccardDedupThreshold: 0.6,
    allowOffTopic: false,
    minQuerySimForCode: 0.40,
    maxSectionsInAnswer: 1,
    focusTopAlignedHeadings: 2,
};

export function summarizeDeterministic(
    query: string,
    kept: ScoredChunk[],
    opts?: SumOptions
): { text: string; cites: Array<{ heading: string }> } {
    // License check removed // Premium feature - requires valid license
    const O = { ...DEFAULTS, ...(opts || {}) };

    // 0) Normalize kept list with stable rrRank/rrScore defaults
    const K = kept.map((c, i) => ({
        ...c,
        rrRank: (typeof c.rrRank === "number" ? c.rrRank : i),
        rrScore: (typeof c.rrScore === "number" ? c.rrScore : (kept.length - i) / Math.max(1, kept.length)),
    }));

    if (K.length === 0) {
        return { text: "No answer could be composed from the provided context.", cites: [] };
    }

    // 1) Scored, stemmed, stopword-aware heading alignment + RR + intent bumps
    const intent = detectIntent(query);

    // normalize rrScore across kept for a small deterministic boost
    let rrMin = Infinity, rrMax = -Infinity;
    for (const c of K) { rrMin = Math.min(rrMin, c.rrScore ?? 0); rrMax = Math.max(rrMax, c.rrScore ?? 0); }
    const rrSpan = (rrMax - rrMin) || 1;

    function intentHit(c: ScoredChunk): number {
        const hay = (c.heading + ' ' + (c.content || '') + ' ' + (c.rich || '')).toLowerCase();
        let hit = 0;
        if (intent.function && /\bfunc\b|\bfunction\b/.test(hay)) hit += 1;
        if (intent.variable && /\bvar\b|\bvariable\b|\b:=\b/.test(hay)) hit += 1;
        if (intent.constant && /\bconst\b|\bconstant\b/.test(hay)) hit += 1;
        if (intent.concurrency && /\bgoroutine\b|\bgo\s+func\b|\bchan(nel)?\b|\bselect\b/.test(hay)) hit += 1;
        if (intent.loop && /\bfor\b/.test(hay)) hit += 1;
        return Math.min(1, hit / 2); // 0..1
    }

    const alignScores = K.map(ch => diceStemmed(query, ch.heading)); // 0..1
    const composite = K.map((c, i) => {
        const align = alignScores[i] || 0;
        const rrNorm = ((c.rrScore ?? 0) - rrMin) / rrSpan; // 0..1
        const ih = intentHit(c);                             // 0..1
        // alignment dominates; rr+intent provide gentle nudges
        return align + 0.15 * rrNorm + 0.20 * ih;
    });

    // rank by composite desc, break ties by rrRank asc
    const allByComposite = K.map((_, i) => i).sort((i, j) => {
        if (composite[j] !== composite[i]) return composite[j] - composite[i];
        return (K[i].rrRank! - K[j].rrRank!);
    });

    // choose top-N aligned headings; ensure at least one is chosen
    const alignedIdxs = allByComposite.slice(0, Math.max(1, O.focusTopAlignedHeadings));
    const allowedChunkIdx = new Set(alignedIdxs);

    // 2) Candidate extraction: sentences + fenced code blocks; stable order
    const queryTok = tokens(query);
    const candidates: Candidate[] = [];
    for (let i = 0; i < K.length; i++) {
        if (!allowedChunkIdx.has(i)) continue; // HARD mask to top aligned headings
        const ch = K[i];
        const base = ch.rich ?? ch.content;

        const parts = splitCodeAware(base); // preserves order; code blocks are atomic
        let localSentIdx = 0;
        for (const part of parts) {
            const hasCode = part.kind === "code";
            const sentList = hasCode ? [part.text] : splitSentences(part.text);

            for (const s of sentList) {
                const trimmed = s.trim();
                if (!trimmed) continue;
                const f = buildFeatures(trimmed, queryTok, ch, O, hasCode);
                candidates.push({
                    sent: trimmed,
                    chunkIdx: i,
                    sentIdx: localSentIdx++,
                    heading: ch.heading,
                    hasCode,
                    features: f,
                    score: 0,
                });
            }
        }
    }

    if (candidates.length === 0) {
        return { text: "No answer could be composed from the aligned context.", cites: [] };
    }

    // 3) Normalize numeric features across candidates → [0,1]
    normalizeFeature(candidates, "querySim");
    normalizeFeature(candidates, "teGain");
    normalizeFeature(candidates, "evidence");
    normalizeFeature(candidates, "rr");

    // 4) Combine with explicit weights + strict, intent-aware gates (deterministic)
    for (const c of candidates) {
        const f = c.features;

        let s =
            O.queryWeight * f.querySim +
            O.teWeight * f.teGain +
            O.evidenceWeight * f.evidence +
            O.rrWeight * f.rr;

        // Intent-aware code gating
        if (c.hasCode) {
            const align = alignScores[c.chunkIdx] || 0;
            const txt = c.sent.toLowerCase();

            let intentOK = true;
            if (intent.function) intentOK = /\bfunc\b/.test(txt);
            if (intent.variable) intentOK = intentOK && (/\bvar\b/.test(txt) || /\b:=\b/.test(txt));
            if (intent.constant) intentOK = intentOK && /\bconst\b/.test(txt);
            if (intent.concurrency) intentOK = intentOK && (/\bgoroutine\b|\bgo\s+func\b|\bchan(nel)?\b|\bselect\b/.test(txt));

            if (!intentOK || align < 0.25 || f.querySim < O.minQuerySimForCode || f.codeRelevance <= 0.2) {
                s *= 0.5; // neuter misaligned code
            } else if (O.preferCode) {
                s += O.codeBonus * Math.min(1, f.codeRelevance * 1.25) * align;
            }
        }

        // Heading bonus scaled by composite alignment
        const hb = Math.min(1, composite[c.chunkIdx] || 0);
        if (hb > 0) s += O.headingBonus * hb;

        // Off-topic heading handling (shouldn’t happen due to hard mask, but keep as fail-safe)
        if (hb === 0 && !O.allowOffTopic) {
            s *= 0.1; // near-zero
        }

        c.score = clamp01p5(s);
    }

    // 5) TOTAL order sort with explicit tie-breakers (stable)
    candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ar = K[a.chunkIdx].rrRank!, br = K[b.chunkIdx].rrRank!;
        if (ar !== br) return ar - br;                                // better reranker rank first
        if (a.chunkIdx !== b.chunkIdx) return a.chunkIdx - b.chunkIdx;// earlier chunk first
        if (a.sentIdx !== b.sentIdx) return a.sentIdx - b.sentIdx;    // earlier sentence first
        return a.sent.localeCompare(b.sent);                          // final deterministic tie-breaker
    });

    // 6) Deterministic dedup (Jaccard) — keep first occurrence only
    const picked: Candidate[] = [];
    const seen: string[] = [];
    for (const c of candidates) {
        const t = c.sent.toLowerCase();
        let dup = false;
        for (const s of seen) {
            if (jaccardText(t, s) >= O.jaccardDedupThreshold) { dup = true; break; }
        }
        if (!dup) { picked.push(c); seen.push(t); }
    }

    // 7) Compose answer under budget with section cap
    const out: string[] = [];
    const citesSet = new Set<string>();
    let budget = O.maxAnswerChars;
    const usedHeadings = new Set<string>();

    for (const c of picked) {
        const h = K[c.chunkIdx].heading;
        const alreadyUsed = usedHeadings.has(h);

        // Enforce max distinct headings
        if (!alreadyUsed && usedHeadings.size >= O.maxSectionsInAnswer) continue;

        const unit = (picked.length > 1 ? `- ${c.sent}` : c.sent);
        const cost = unit.length + (out.length ? 1 : 0);
        if (cost > budget) continue;

        out.push(unit);
        budget -= cost;
        usedHeadings.add(h);
        if (O.includeCitations) citesSet.add(h);
        if (out.length >= O.maxBullets) break;
    }

    // Fallback if nothing fits budget
    if (out.length === 0 && picked.length > 0) {
        const c = picked[0];
        out.push(c.sent);
        citesSet.add(K[c.chunkIdx].heading);
    }

    let text = picked.length > 1 ? out.join("\n") : out.join("");
    const cites = [...citesSet].map(h => ({ heading: h }));

    if (O.addFooter && cites.length > 0) {
        text += `\n\n---\n**Sources used:**\n` + cites.map(c => `- ${c.heading}`).join("\n");
    }

    return { text, cites };
}

/* -------------------- helpers (deterministic) -------------------- */

function clamp01p5(x: number): number {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1.5, x));
}

function tokens(s: string): string[] {
    return s.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
}

// code-aware split: returns a sequence of {kind: "code"|"text", text}
function splitCodeAware(raw: string): Array<{ kind: "code" | "text"; text: string }> {
    const out: Array<{ kind: "code" | "text"; text: string }> = [];
    const re = /```([\s\S]*?)```/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
        const before = raw.slice(last, m.index);
        if (before.trim()) out.push({ kind: "text", text: normalizeWS(before) });
        const code = m[1];
        if (code.trim()) out.push({ kind: "code", text: "```" + normalizeWS(code) + "```" });
        last = m.index + m[0].length;
    }
    const tail = raw.slice(last);
    if (tail.trim()) out.push({ kind: "text", text: normalizeWS(tail) });
    return out;
}

// conservative sentence splitter (period, question, exclamation)
function splitSentences(text: string): string[] {
    // split on sentence boundaries; also split on blank lines to avoid giant paragraphs
    const parts = text.split(/(?<=[\.\?\!])\s+(?=[A-Z0-9[`])/g);
    return parts.flatMap(p => p.split(/\n{2,}/g)).map(s => s.trim()).filter(Boolean);
}

function normalizeWS(s: string) {
    return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function bow(ts: string[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const t of ts) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0, na = 0, nb = 0;
    for (const [, v] of a) na += v * v;
    for (const [, v] of b) nb += v * v;
    const n = Math.sqrt(na || 1e-9) * Math.sqrt(nb || 1e-9);
    if (n === 0) return 0;
    const smaller = a.size < b.size ? a : b;
    const larger = a.size < b.size ? b : a;
    for (const [k, v] of smaller) {
        const w = larger.get(k);
        if (w) dot += v * w;
    }
    const val = dot / n;
    return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0;
}

// normalize each named feature across candidates → [0,1] deterministically
function normalizeFeature(cands: Candidate[], key: keyof Candidate["features"]) {
    let min = Infinity, max = -Infinity;
    for (const c of cands) {
        const v = (c.features[key] as unknown as number) ?? 0;
        const vv = Number.isFinite(v) ? v : 0;
        if (vv < min) min = vv;
        if (vv > max) max = vv;
    }
    const span = (max - min) || 1;
    for (const c of cands) {
        const v = (c.features[key] as unknown as number) ?? 0;
        const vv = Number.isFinite(v) ? v : 0;
        (c.features as any)[key] = (vv - min) / span;
    }
}

function jaccardText(a: string, b: string): number {
    const A = new Set(a.split(/\W+/).filter(Boolean));
    const B = new Set(b.split(/\W+/).filter(Boolean));
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / Math.max(1, A.size + B.size - inter);
}

/* ---------- stopwords + intent ---------- */

const STOP = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'in', 'on', 'for', 'to', 'from', 'by',
    'with', 'without', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'at', 'it', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'do', 'does', 'did', 'how', 'what', 'when',
    'where', 'why', 'which', 'can', 'could', 'should', 'would'
]);

function filterStops(ts: string[]): string[] {
    return ts.filter(t => !STOP.has(t));
}

type Intent = {
    function: boolean;
    variable: boolean;
    constant: boolean;
    concurrency: boolean;
    loop: boolean;
};

function detectIntent(q: string): Intent {
    const s = q.toLowerCase();
    return {
        function: /\bfunc(tion|)\b|\bdefine\b|\bdeclar(e|ation)\b|\bprototype\b/.test(s),
        variable: /\bvar(iable)?\b|\bdeclare\b/.test(s),
        constant: /\bconst(ant)?\b/.test(s),
        concurrency: /\bconcurrency\b|\bgoroutine\b|\bchannel\b|\bselect\b/.test(s),
        loop: /\bfor\s+loop\b|\bloop\b|\bfor\b/.test(s),
    };
}

/* ---------- light stemming + stemmed Dice alignment (0..1) ---------- */

function stemToken(w: string): string {
    let s = w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    if (s.length <= 2) return s;

    if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y';
    else if (/(xes|ches|shes|zes|sses)$/.test(s) && s.length > 4)
        s = s.replace(/(xes|ches|shes|zes|sses)$/, (m) => (m === 'sses' ? 'ss' : m.replace(/es$/, '')));
    else if (s.endsWith('s') && !/(ss|us)$/.test(s) && s.length > 3) s = s.slice(0, -1);

    const rules: [RegExp, string][] = [
        [/ization$|isation$/, 'ize'],
        [/ational$/, 'ate'],
        [/fulness$/, 'ful'],
        [/ousness$/, 'ous'],
        [/iveness$/, 'ive'],
        [/ability$/, 'able'],
        [/ness$/, ''],
        [/ment$/, ''],
        [/ations?$/, 'ate'],
        [/izer$|iser$/, 'ize'],
        [/ally$/, 'al'],
        [/ically$/, 'ic'],
        [/ingly$|edly$/, ''],
        [/ing$|ed$/, ''],
    ];
    for (const [re, rep] of rules) {
        if (re.test(s) && s.length - rep.length >= 4) { s = s.replace(re, rep); break; }
    }
    return s;
}

function stemTokens(str: string): string[] {
    const raw = (str.toLowerCase().match(/[a-z0-9_]+/g) ?? []);
    const stemmed = raw.map(stemToken).filter(Boolean);
    return filterStops(stemmed);
}

// Dice coefficient over stemmed tokens (0..1). Robust for short strings.
function diceStemmed(a: string, b: string): number {
    const A = new Set(stemTokens(a));
    const B = new Set(stemTokens(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return (2 * inter) / (A.size + B.size);
}

// Overlap between code tokens and query tokens (fraction of code tokens in query)
function cCodeRelevance(sentence: string, queryTokens: string[]): number {
    if (!sentence.includes("```")) return 0;
    const codeTokens = tokens(sentence.replace(/```/g, ""));
    if (codeTokens.length === 0) return 0;
    const Q = new Set(queryTokens);
    let overlap = 0;
    for (const t of codeTokens) {
        if (Q.has(t)) overlap++;
    }
    return overlap / codeTokens.length;
}

// Feature builder (deterministic). If you have TE per chunk/sentence, inject it here.
function buildFeatures(
    sentence: string,
    queryTokens: string[],
    ch: ScoredChunk,
    _O: Required<SumOptions>,
    hasCode: boolean
): Candidate["features"] {
    // querySim (raw) via cosine on hashed BoW; normalized later
    const qvec = bow(queryTokens);
    const svec = bow(tokens(sentence));
    const querySimRaw = cosine(qvec, svec); // 0..1

    // sentence↔heading local alignment (stemmed); treat ≥0.15 as aligned
    const localAlignScore = diceStemmed(sentence, ch.heading);
    const headingAligned = localAlignScore >= 0.15;

    // teGain: placeholder (replace with your TE if you have it)
    const teGainRaw = headingAligned ? 1 : 0;

    // evidence: proxy for coverage/utility (bounded length effect)
    const evRaw = Math.min(1, tokens(sentence).length / 40);

    const rrRaw = (typeof ch.rrScore === "number") ? ch.rrScore : 0;

    const codeRel = hasCode ? cCodeRelevance(sentence, queryTokens) : 0;

    return {
        querySim: querySimRaw,
        teGain: teGainRaw,
        evidence: evRaw,
        rr: rrRaw,
        headingAligned,
        codeRelevance: codeRel,
    };
}
