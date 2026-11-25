export const translateText = async (text: string, target: string) => {
  const lang = target.split('-')[0];
  const q = encodeURIComponent(text.slice(0, 500));
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=Autodetect|${lang}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.responseData.translatedText as string;
};
