export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  isDragging?: boolean;
}

export interface InstructorSettings {
  courseName: string;
  discipline: string;
  challengeTone: string;
  numQuestions: number;
  allowEvidenceTypes: boolean;
  focusArea: string; // 'causation' | 'bias' | 'context' | 'chronology' | 'counterargument'
  systemPromptOverride: string;
}

export interface FeedbackLog {
  id: string;
  timestamp: string;
  mode: string;
  topic: string;
  feedback: string;
}
