export type StoryStatus = "draft" | "published";

export type MonthCover = { month: number; image_url: string };

export type StoryActivities = {
  cloze_text: string;
  true_false: string[];
  short_answer: string[];
  discussion: string[];
  true_false_answers?: boolean[];
  short_answer_keys?: string[];
  vocabulary?: { term: string; meaning: string }[];
  language_notice?: string;
};

export type Question = {
  id: string;
  story_id: string;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
  sort_order: number;
};

export type Story = {
  id: string;
  month: number;
  day: number;
  title: string;
  summary: string;
  content: string;
  youtube_url: string;
  image_url: string;
  level: string;
  duration_minutes: number;
  status: StoryStatus;
  activities?: StoryActivities;
  questions?: Question[];
};

export type Attempt = {
  story_id: string;
  score: number;
  total: number;
  answers: number[];
  created_at: string;
};
