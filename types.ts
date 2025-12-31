
export enum AppState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  SPEAKING = 'SPEAKING',
  REVIEWING = 'REVIEWING'
}

export interface FeedbackData {
  transcription: string;
  feedback: string;
  pronunciationTips: string[];
  grammarNotes: string[];
  fluencyScore: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}
