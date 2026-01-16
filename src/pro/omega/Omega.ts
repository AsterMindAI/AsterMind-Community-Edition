// Omega.ts v2 — improved local reasoning + summarization
// uses your math.ts, rff.ts, online_ridge.ts

import { cosine, l2, normalizeL2 } from "../math/index.js";
import { buildRFF, mapRFF } from "../math/rff.js";
import { OnlineRidge } from "../math/online-ridge.js";
// License removed - all features are now free!

export interface RetrievedChunk {
    heading: string;
    content: string;
    score?: number;
}

export interface OmegaOptions {
    dim?: number;
    features?: number;
    sigma?: number;
    rounds?: number;
    topSentences?: number;
    personality?: "neutral" | "teacher" | "scientist";
}

// -------- sentence + text helpers ----------
function splitSentences(text: string): string[] {
    return text
        .replace(/\s+/g, " ")
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8 && /\w/.test(s));
}

function clean(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]+`/g, " ")
        .replace(/\[[^\]]*\]\([^)]*\)/g, "") // strip markdown links
        .replace(/[-–>•→]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isMetaSentence(s: string): boolean {
    // simple heuristics for table-of-contents or chapter headings
    return (
        /^(\*|#)/.test(s) ||                        // markdown markers
        /chapter/i.test(s) ||                       // "Chapter 11", "Chapters 11–15"
        /part\s*\d+/i.test(s) ||                    // "Part 3"
        /section/i.test(s) ||                       // "Section 2.3"
        /^\s*[A-Z]\)\s*$/.test(s) ||                // single-letter outlines
        s.length < 15                               // very short stray lines
    );
}


function rewrite(summary: string): string {
    return summary
        .replace(/\s+[-–>•→]\s+/g, " ")
        .replace(/\s+\.\s+/g, ". ")
        .replace(/([a-z]) - ([a-z])/gi, "$1-$2")
        .replace(/\s{2,}/g, " ")
        .trim();
}

// ------------------------------------------------------------
export async function omegaComposeAnswer(
    question: string,
    items: RetrievedChunk[],
    opts: OmegaOptions = {}
): Promise<string> {
    // License check removed // Premium feature - requires valid license
    if (!items?.length) return "No results found.";

    const {
        dim = 64,
        features = 32,
        sigma = 1.0,
        rounds = 3,
        topSentences = 8,
        personality = "neutral",
    } = opts;

    // ---------- 1. Clean + collect sentences ----------
    const allText = items.map((i) => clean(i.content)).join(" ");
    let sentences = splitSentences(allText)
        .filter(s => !isMetaSentence(s))
        .slice(0, 120);
    if (sentences.length === 0) return clean(items[0].content).slice(0, 400);

    // ---------- 2. Build encoder + ridge ----------
    const rff = buildRFF(dim, features, sigma);
    const ridge = new OnlineRidge(2 * features, 1, 1e-3);

    const encode = (s: string): Float64Array => {
        const vec = new Float64Array(dim);
        const len = Math.min(s.length, dim);
        for (let i = 0; i < len; i++) vec[i] = s.charCodeAt(i) / 255;
        return mapRFF(rff, normalizeL2(vec));
    };

    const qVec = encode(question);
    const qTokens = question.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

    // ---------- 3. Score + select top sentences ----------
    const scored = sentences.map((s) => {
        const v = encode(s);
        let w = cosine(v, qVec);
        // small lexical bonus for overlapping words
        const lower = s.toLowerCase();
        for (const t of qTokens) if (lower.includes(t)) w += 0.02;
        return { s, v, w };
    });
    scored.sort((a, b) => b.w - a.w);
    let top = scored.slice(0, topSentences);

    // ---------- 4. Recursive compression ----------
    let summary = top.map((t) => t.s).join(" ");
    let meanVec = new Float64Array(2 * features);

    for (let r = 0; r < rounds; r++) {
        const subs = splitSentences(summary).slice(0, topSentences);
        const embeds = subs.map((s) => encode(s));
        const weights = embeds.map((v) => cosine(v, qVec));

        for (let i = 0; i < embeds.length; i++) {
            ridge.update(embeds[i], new Float64Array([weights[i]]));
        }

        // weighted mean vector
        meanVec.fill(0);
        for (let i = 0; i < embeds.length; i++) {
            const v = embeds[i],
                w = weights[i];
            for (let j = 0; j < v.length; j++) meanVec[j] += v[j] * w;
        }
        const norm = l2(meanVec) || 1;
        for (let j = 0; j < meanVec.length; j++) meanVec[j] /= norm;

        const rescored = subs.map((s) => ({
            s,
            w: cosine(encode(s), meanVec),
        }));
        rescored.sort((a, b) => b.w - a.w);
        summary = rescored
            .slice(0, Math.max(3, Math.floor(topSentences / 2)))
            .map((r) => r.s)
            .join(" ");
    }

    // ---------- 5. Compose readable answer ----------
    summary = rewrite(summary);
    const firstChar = summary.charAt(0).toUpperCase() + summary.slice(1);
    const title = items[0].heading || "Answer";
    const prefix =
        personality === "teacher"
            ? "Here’s a simple way to think about it:\n\n"
            : personality === "scientist"
                ? "From the retrieved material, we can infer:\n\n"
                : "";

    return `${prefix}${firstChar}\n\n(${title}, Ω-synthesized)`;
}
