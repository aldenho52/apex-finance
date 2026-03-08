export interface LearningArticle {
  id: number;
  date: string;
  title: string;
  summary: string;
  content: string;
  topic: string;
  week_number: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  reading_time_minutes: number;
  further_reading: FurtherReading[];
  user_read: boolean;
  user_bookmarked: boolean;
}

export interface FurtherReading {
  title: string;
  url: string;
  source: string;
}

export interface ArticleListItem {
  id: number;
  date: string;
  title: string;
  summary: string;
  topic: string;
  difficulty: string;
  reading_time_minutes: number;
  user_read: boolean;
  user_bookmarked: boolean;
}
