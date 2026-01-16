// Tokenization and stemming utilities
// Extracted from workers for reuse

// Memo for speed
const STEM_CACHE = new Map<string, string>();

export function normalizeWord(raw: string): string {
  const k = raw;
  const cached = STEM_CACHE.get(k);
  if (cached) return cached;

  let w = raw.toLowerCase();
  w = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

  if (w.length <= 2) { STEM_CACHE.set(k, w); return w; }

  // plural → singular
  if (w.endsWith('ies') && w.length > 4) {
    w = w.slice(0, -3) + 'y';
  } else if (/(xes|ches|shes|zes|sses)$/.test(w) && w.length > 4) {
    w = w.replace(/(xes|ches|shes|zes|sses)$/, (m) => (m === 'sses' ? 'ss' : m.replace(/es$/, '')));
  } else if (w.endsWith('s') && !/(ss|us)$/.test(w) && w.length > 3) {
    w = w.slice(0, -1);
  }

  // conservative suffix trimming
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
    if (re.test(w) && w.length - rep.length >= 4) {
      w = w.replace(re, rep);
      break;
    }
  }

  STEM_CACHE.set(k, w);
  return w;
}

export function tokenize(text: string, doStem: boolean): string[] {
  const base = text.toLowerCase()
    .replace(/[`*_>~]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!doStem) return base;

  const out: string[] = [];
  for (const t of base) {
    const n = normalizeWord(t);
    if (n && n.length > 1) out.push(n);
  }
  return out;
}

export function expandQuery(q: string): string {
  const adds: string[] = [];
  if (/\bmap\b/.test(q)) adds.push('dict key value make');
  if (/\bchan|channel\b/.test(q)) adds.push('goroutine concurrency select buffer');
  if (/\berror\b/.test(q)) adds.push('fmt wrap unwrap sentinel try catch');
  if (/\bstruct\b/.test(q)) adds.push('field method receiver init zero value');
  return q + ' ' + adds.join(' ');
}











