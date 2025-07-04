// app/utils/subtitles.ts
export interface Cue {
  startMs: number;
  endMs:   number;
  text:    string;
}

export function parseSrt(input: string): Cue[] {
  const blocks = input
    .split(/\r?\n\r?\n/)     // split on blank lines
    .map(b => b.trim())
    .filter(Boolean);

  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 2) continue;
    const m = lines[1].match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!m) continue;
    const [, startTs, endTs] = m;
    const toMs = (ts: string) => {
      const [hms, ms] = ts.split(',');
      const [h, m, s] = hms.split(':').map(Number);
      return (h * 3600 + m * 60 + s) * 1000 + Number(ms);
    };
    const text = lines.slice(2).join('\n').trim();
    cues.push({ startMs: toMs(startTs), endMs: toMs(endTs), text });
  }
  return cues;
}