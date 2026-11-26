const MAX_CHARS = 450;
const MAX_CHUNKS = 8;

const splitIntoChunks = (text: string): string[] => {
  // Split at sentence ends and newlines, but not at dots inside links
  const pieces = (
    text.match(/(?:[^.!?\n]|[.!?](?!\s|$))+[.!?]*[ \t]*|\n+|[\s\S]/g) || [text]
  ).flatMap((p) =>
    p.length <= MAX_CHARS
      ? [p]
      : p.match(new RegExp(`.{1,${MAX_CHARS}}(\\s|$)|\\S+`, 'g')) || [p],
  );

  const chunks: string[] = [];
  let current = '';
  for (const p of pieces) {
    if (current && (current + p).length > MAX_CHARS) {
      chunks.push(current);
      current = p;
    } else {
      current += p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

type ChunkResult = { text: string; sent: boolean; ok: boolean };

const translateChunk = async (chunk: string, lang: string): Promise<ChunkResult> => {
  const lead = chunk.match(/^\s*/)?.[0] || '';
  const trail = chunk.match(/\s*$/)?.[0] || '';
  const core = chunk.trim();

  // Skip chunks with no real words (links, hashtags, emoji only)
  const words = core.replace(/https?:\/\/\S+/g, '').replace(/#\S+/g, '');
  if (!/\p{L}{2}/u.test(words)) {
    return { text: chunk, sent: false, ok: true };
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(core)}&langpair=Autodetect|${lang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (Number(data.responseStatus) !== 200) {
      return { text: chunk, sent: true, ok: false };
    }
    return {
      text: lead + (data.responseData.translatedText as string) + trail,
      sent: true,
      ok: true,
    };
  } catch (e) {
    return { text: chunk, sent: true, ok: false };
  }
};

export const translateText = async (text: string, target: string) => {
  const lang = target.split('-')[0];
  const chunks = splitIntoChunks(text).slice(0, MAX_CHUNKS);

  const results: ChunkResult[] = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, lang));
  }

  const sent = results.filter((r) => r.sent);
  if (sent.length > 0 && sent.every((r) => !r.ok)) {
    throw new Error('Translation failed');
  }
  return results.map((r) => r.text).join('');
};
