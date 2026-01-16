// Markdown parsing utilities
// Extracted from workers for reuse

const FENCE_RE = /```[\s\S]*?```/g;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export type SectionNode = {
  id: number;
  level: number;           // 2 for ##, 3 for ### ...
  heading: string;
  rich: string;            // full markdown for this section's body (excludes its heading line)
  content: string;         // plain text for indexing
  children: SectionNode[];
  parent?: number;
};

export type Chunk = { 
  heading: string; 
  content: string; 
  rich?: string; 
  level?: number; 
  secId?: number 
};

export function stripForIndex(md: string, opts: { stripCode: boolean; stripLinks: boolean }): string {
  let s = md;

  if (opts.stripCode) {
    // Preserve a 1-line signature from the first non-empty line inside each fenced block.
    s = s.replace(FENCE_RE, m => {
      const lines = m.split('\n').slice(1, -1);
      const sig = (lines.find(l => l.trim()) || '').trim();
      return sig ? `\n${sig}\n` : '\n<code omitted>\n';
    });
  }

  if (opts.stripLinks) {
    // Keep anchor text, drop target
    s = s.replace(LINK_RE, '$1');
  }

  // Light cleanup
  s = s.replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return s;
}

export function parseMarkdownToSections(md: string, opts = { stripCode: true, stripLinks: true }): SectionNode {
  const lines = md.split(/\r?\n/);
  const root: SectionNode = { id: 0, level: 1, heading: '(root)', content: '', rich: '', children: [] };
  let current: SectionNode | null = null;
  const stack: SectionNode[] = [root];
  let nextId = 1;
  let buf: string[] = [];

  const flush = (buf: string[], target: SectionNode | null) => {
    if (!target) return;
    const rich = buf.join('\n').trim();
    target.rich = rich;
    target.content = stripForIndex(rich, opts);
  };

  for (const line of lines) {
    const mH = /^(#{2,6})\s+(.*)$/.exec(line);
    if (mH) {
      // heading line
      flush(buf, current);
      buf = [];

      const level = mH[1].length;
      const heading = mH[2].trim();

      const sec: SectionNode = { id: nextId++, level, heading, content: '', rich: '', children: [] };

      // Find proper parent
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack[stack.length - 1] || root;
      parent.children.push(sec);
      sec.parent = parent.id;

      stack.push(sec);
      current = sec;
    } else {
      buf.push(line);
    }
  }
  flush(buf, current);
  return root;
}

export function backfillEmptyParents(root: SectionNode): void {
  const visit = (s: SectionNode) => {
    s.children.forEach(visit);

    // Backfill typical chapter parents (##) only; adjust as needed
    if (s.level === 2) {
      const isEmpty = !s.content || !s.content.trim();
      if (isEmpty) {
        const childSummaries = s.children
          .filter(c => (c.content || c.rich).trim())
          .slice(0, 2)
          .map(c => {
            const body = (c.content || c.rich).split('\n').slice(0, 3).join('\n');
            return `### ${c.heading}\n${body}`;
          });

        if (childSummaries.length) {
          s.content = childSummaries.join('\n\n');
          if (!s.rich?.trim()) {
            s.rich = `> Summary of subsections:\n\n${childSummaries.join('\n\n')}`;
          }
        }
      }
    }
  };
  visit(root);
}

export function flattenSections(root: SectionNode): Chunk[] {
  const out: Chunk[] = [];
  const walk = (s: SectionNode) => {
    if (s.id !== 0 && s.heading) {
      out.push({ heading: s.heading, content: s.content, rich: s.rich, secId: s.id, level: s.level });
    }
    s.children.forEach(walk);
  };
  walk(root);
  return out;
}











