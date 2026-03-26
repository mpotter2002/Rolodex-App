import { supabase } from './supabase';
import { StructuredScanResult } from '../types/scan';

interface ExtractCardPayload {
  rawText: string;
  imageDataUrl?: string | null;
}

function normalizeCandidates(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = (value || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

function normalizeField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeStructuredScanResult(data: any): StructuredScanResult {
  const primary = {
    name: normalizeField(data?.primary?.name),
    title: normalizeField(data?.primary?.title),
    company: normalizeField(data?.primary?.company),
    phone: normalizeField(data?.primary?.phone),
    email: normalizeField(data?.primary?.email),
    website: normalizeField(data?.primary?.website),
    address: normalizeField(data?.primary?.address),
    notes: normalizeField(data?.primary?.notes),
  };

  const candidates = {
    names: normalizeCandidates(data?.candidates?.names),
    titles: normalizeCandidates(data?.candidates?.titles),
    companies: normalizeCandidates(data?.candidates?.companies),
    phones: normalizeCandidates(data?.candidates?.phones),
    emails: normalizeCandidates(data?.candidates?.emails),
    websites: normalizeCandidates(data?.candidates?.websites),
    addresses: normalizeCandidates(data?.candidates?.addresses),
    notes: normalizeCandidates(data?.candidates?.notes),
  };

  const multipleDetected = Boolean(
    data?.multipleDetected ||
    Object.values(candidates).some((group) => group.length > 1),
  );

  const needsReview = Boolean(
    data?.needsReview ||
    multipleDetected ||
    !primary.name ||
    !primary.company ||
    (!primary.email && !primary.phone),
  );

  return { primary, candidates, multipleDetected, needsReview };
}

export async function extractCardWithAi(payload: ExtractCardPayload): Promise<StructuredScanResult> {
  const { data, error } = await supabase.functions.invoke('extract-card', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return normalizeStructuredScanResult(data);
}
