export interface Card {
  id: string;
  frontType: 'text' | 'image';
  frontContent: string;
  backType: 'text' | 'image';
  backContent: string;
  folderId: string;
  tags: string[];
  createdAt: number;
  
  // SRS Fields
  nextReviewTime: number; // Timestamp when it should be shown again
  interval: number; // Current interval in minutes
  repetition: number; // How many times successfully reviewed in a row
  easeFactor: number; // For SM-2 algorithm, default 2.5
  
  // New Fields
  phonetic?: string; // IPA pronunciation
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Settings {
  apiKey: string;
  provider: 'google' | 'siliconflow';
  userName: string;
}

export enum ViewState {
  WELCOME = 'WELCOME',
  HOME = 'HOME',
  CREATE = 'CREATE',
  IMPORT = 'IMPORT',
  REVIEW = 'REVIEW',
  SETTINGS = 'SETTINGS',
  FOLDER_DETAIL = 'FOLDER_DETAIL'
}

export interface AIImportResult {
  front: string;
  back: string;
  phonetic: string;
  example: string;
  exampleTranslation: string;
}