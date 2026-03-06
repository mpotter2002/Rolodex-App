import TextRecognition from '@react-native-ml-kit/text-recognition';

interface ParsedCard {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
}

const PROBABLE_TITLES = [
  'founder', 'ceo', 'co-founder', 'director', 'manager', 'lead', 'president',
  'vp', 'vice president', 'engineer', 'designer', 'consultant', 'partner',
  'owner', 'specialist', 'coordinator', 'agent', 'attorney', 'chef', 'producer',
];

export async function recognizeText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);
  return result.text || '';
}

export function parseCardText(rawText: string): ParsedCard {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const email = findMatch(rawText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const website = findMatch(rawText, /(https?:\/\/)?([A-Z0-9.-]+\.[A-Z]{2,})(?:\/[\w\-./?%&=]*)?/i);
  const phone = findMatch(rawText, /(?:\+?\d[\d().\s-]{7,}\d)/i);
  const linkedin = findLine(lines, (l) => /linkedin\.com/i.test(l));
  const address = findLine(lines, (l) =>
    /\d+\s+.+(street|st\b|avenue|ave\b|road|rd\b|suite|ste\b|blvd|boulevard|drive|dr\b|lane|ln\b)/i.test(l)
  );

  const normalizedLines = lines
    .filter((l) => !l.includes('@'))
    .filter((l) => !/https?:\/\//i.test(l))
    .filter((l) => !/\.com|\.io|\.net|\.org|\.co\b/i.test(l))
    .filter((l) => !/\+?\d[\d().\s-]{7,}\d/.test(l));

  const nameCandidate = normalizedLines.find((l) => looksLikePersonName(l)) || '';
  const companyCandidate = normalizedLines.find((l) => looksLikeCompany(l, nameCandidate)) || '';
  const titleCandidate = normalizedLines.find((l) => looksLikeTitle(l)) || '';

  return {
    name: cleanField(nameCandidate),
    title: cleanField(titleCandidate),
    company: cleanField(companyCandidate),
    phone: cleanField(phone),
    email: cleanField(email),
    website: cleanWebsite(cleanField(website)),
    address: cleanField(address),
    notes: cleanField(linkedin && linkedin !== website ? linkedin : ''),
  };
}

function looksLikePersonName(line: string): boolean {
  if (line.length < 4 || line.length > 36) return false;
  if (/\d/.test(line)) return false;
  if (/\b(inc|llc|corp|company|group|studio|solutions|agency)\b/i.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[A-Z][a-z'`-]{1,}$/.test(w));
}

function looksLikeCompany(line: string, currentName: string): boolean {
  if (!line || line === currentName) return false;
  if (line.length < 2 || line.length > 40) return false;
  if (/\d/.test(line)) return false;
  if (/\b(phone|mobile|fax|email|www|linkedin|follow)\b/i.test(line)) return false;
  return (
    /\b(inc|llc|corp|company|co\.|group|studio|labs|agency|partners|consulting|digital|systems)\b/i.test(line) ||
    /^[A-Z][A-Za-z&'\- ]{2,}$/.test(line)
  );
}

function looksLikeTitle(line: string): boolean {
  const lc = line.toLowerCase();
  return PROBABLE_TITLES.some((term) => lc.includes(term));
}

function findLine(lines: string[], predicate: (l: string) => boolean): string {
  return lines.find(predicate) || '';
}

function findMatch(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match ? match[0] : '';
}

function cleanWebsite(site: string): string {
  if (!site) return '';
  if (/^https?:\/\//i.test(site)) return site;
  return site.startsWith('www.') || site.includes('.') ? `https://${site}` : site;
}

function cleanField(value: string): string {
  return (value || '')
    .replace(/[|]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
