export interface ScanCandidateGroups {
  names: string[];
  titles: string[];
  companies: string[];
  phones: string[];
  emails: string[];
  websites: string[];
  addresses: string[];
  notes: string[];
}

export interface ScanPrimaryContact {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
}

export interface StructuredScanResult {
  primary: ScanPrimaryContact;
  candidates: ScanCandidateGroups;
  multipleDetected: boolean;
  needsReview: boolean;
}
