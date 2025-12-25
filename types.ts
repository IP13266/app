export enum WorkflowStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING', // Reverse prompting
  GENERATING = 'GENERATING', // Image to Image
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface WorkItem {
  id: string;
  file: File;
  previewUrl: string;
  status: WorkflowStatus;
  originalPrompt?: string; // The prompt derived from the image
  generatedImageUrl?: string;
  error?: string;
  progressLog: string[];
}

export interface ProcessingStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface ServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  systemInstruction?: string;
  aspectRatio?: string;
}

export interface AppSettings {
  analysisConfig: ServiceConfig;
  generationConfig: ServiceConfig;
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  details?: any; // JSON object for expanded view
}