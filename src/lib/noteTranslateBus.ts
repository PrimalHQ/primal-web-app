type TranslateAsk = () => void;

const asks = new Map<string, Set<TranslateAsk>>();

export const watchNoteTranslateAsk = (noteId: string, fn: TranslateAsk): (() => void) => {
  let bucket = asks.get(noteId);
  if (!bucket) {
    bucket = new Set();
    asks.set(noteId, bucket);
  }
  bucket.add(fn);
  return () => {
    bucket?.delete(fn);
    if (bucket && bucket.size === 0) asks.delete(noteId);
  };
};

export const askNoteTranslate = (noteId: string) => {
  asks.get(noteId)?.forEach((fn) => fn());
};
