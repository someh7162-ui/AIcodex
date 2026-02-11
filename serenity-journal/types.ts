export interface DiaryEntry {
  id: string;
  date: string; // e.g., "10月12日"
  fullDate?: string; // e.g., "2024-10-12"
  weather: string;
  mood: string;
  moodEmoji: string;
  weatherEmoji: string;
  title?: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
}

export type ViewState = 'TIMELINE' | 'EDITOR' | 'INSIGHTS' | 'CALENDAR' | 'GALLERY' | 'SETTINGS';

export interface MoodStat {
  color: string;
  opacity: number;
}
