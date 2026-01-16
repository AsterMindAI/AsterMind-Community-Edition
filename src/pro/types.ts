export type Kernel = 'rbf' | 'cosine' | 'poly2';

export type Settings = {
    ridge?: number;
    elmEnabled?: boolean;
    elmDim?: number;
    elmMix?: number;
    alpha: number;
    beta: number;
    sigma: number;
    kernel: Kernel;
    vocab: number;
    landmarks: number;
    prefilter: number;
    topK: number;
    headingW: number;
    chunk: number;
    overlap: number;
    penalizeLinks: boolean;
    stripCode: boolean;
    expandQuery: boolean;
    useStem: boolean;
    enableInfoFlow?: boolean;     // default: false
    infoFlowMode: string,   // 'base' | 'pws'
    infoFlowWindow?: number;      // default: 256
    infoFlowCondLags?: number;    // default: 1
};

export type Section = { heading: string; content: string; };

export type WorkerInit = {
    action: 'init';
    payload: {
        settings: Partial<Settings>;
        chaptersPath?: string;
    };
};

export type WorkerAsk = {
    action: 'ask';
    payload: { q: string; settings?: Partial<Settings>; };
};

export type WorkerReindex = {
    action: 'reindex';
    payload?: { settings?: Partial<Settings>; };
};

export type WorkerAutoTune = {
    action: 'autotune';
    payload?: {
        budget?: number;
        sampleQueries?: number;
    } & Partial<Settings>;
};

export type WorkerReset = { action: 'reset'; };

export type UiToWorker =
    | WorkerInit | WorkerAsk | WorkerReindex | WorkerAutoTune | WorkerReset;

export type WorkerMsg =
    | { type: 'ready' }
    | { type: 'indexed'; docs: number; stats: string; }
    | { type: 'answer'; text: string; }
    | { type: 'results'; items: Array<{ score: number; heading: string; content: string; }>; }
    | { type: 'stats'; text: string; }
    | { type: 'kept'; items: Array<{ heading: string; p: number; rr: number; }>; }
    | { type: 'infoflow'; te: Record<string, number>; }
    | { type: 'autotune/progress'; trial: number; best: number; note: string; }
    | { type: 'autotune/done'; best: Settings; score: number; }
    | { type: 'error'; error: string; };

// Production worker messages (inference only)
export type ProductionWorkerInit = {
    action: 'init';
    payload: {
        model: SerializedModel;
    };
};

export type ProductionWorkerAsk = {
    action: 'ask';
    payload: { q: string; settings?: Partial<Settings>; };
};

export type ProductionUiToWorker = ProductionWorkerInit | ProductionWorkerAsk;

export type ProductionWorkerMsg =
    | { type: 'ready' }
    | { type: 'answer'; text: string; }
    | { type: 'results'; items: Array<{ score: number; heading: string; content: string; }>; }
    | { type: 'stats'; text: string; }
    | { type: 'error'; error: string; };

export type SerializedModel = {
    version: 'astermind-pro-v1';
    savedAt: string;                 // ISO timestamp
    hash?: string;                   // optional checksum of chunks + vectors

    // settings that affect retrieval & projection
    settings: any;                   // copy of SETTINGS used at runtime (alpha, sigma, kernel, etc.)

    // vocab & tf-idf space
    vocab: [string, number][],       // entries of vocabMap (token -> index)
    idf: number[],                   // idf array (length == vocab size)

    // corpus (minimal text needed for citations/summaries)
    chunks: Array<{
        heading: string;
        content: string;               // plain indexable text
        rich?: string;                 // optional rich (keep if you want code fences)
        level?: number;
        secId?: number;
    }>,

    // sparse TF-IDF for each chunk (as pairs to stay compact)
    tfidfDocs: Array<Array<[number, number]>>,

    // Nyström state
    landmarksIdx: number[],
    landmarkMat: number[][],         // dense landmark vectors
    denseDocs?: number[][],          // OPTIONAL: store to avoid recompute (can omit)
};


