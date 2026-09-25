"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_STORIES } from "./catalog";
import type { Attempt, Question, Story } from "./types";

const STORY_KEY = "storyday:stories:v1";
const ATTEMPT_KEY = "storyday:attempts:v1";
const DELETED_KEY = "storyday:deleted:v1";

export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (isDemo) return null;
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}

function localStories(): Story[] {
  try {
    const raw = localStorage.getItem(STORY_KEY);
    const stored = raw ? JSON.parse(raw) as Story[] : [];
    const deleted = new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || "[]") as string[]);
    const defaults = DEMO_STORIES.filter(seed => !deleted.has(seed.id) && !stored.some(item => item.id === seed.id || (item.month === seed.month && item.day === seed.day)));
    return [...defaults, ...stored.filter(item => !deleted.has(item.id))];
  } catch { return DEMO_STORIES; }
}

export async function getStories(includeDrafts = false): Promise<Story[]> {
  const db = supabase();
  if (!db) return localStories().filter(story => includeDrafts || story.status === "published");
  let query = db.from("stories").select("*, questions(*)").order("month").order("day");
  if (!includeDrafts) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;
  return (data as Story[]).map(story => ({ ...story, questions: [...(story.questions || [])].sort((a, b) => a.sort_order - b.sort_order) }));
}

export async function saveStory(story: Story): Promise<void> {
  const db = supabase();
  if (!db) {
    const stories = localStories().filter(item => item.id !== story.id && !(item.month === story.month && item.day === story.day));
    localStorage.setItem(STORY_KEY, JSON.stringify([...stories, story]));
    const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]") as string[];
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted.filter(id => id !== story.id)));
    return;
  }
  const { questions = [], ...record } = story;
  const { error } = await db.from("stories").upsert(record);
  if (error) throw error;
  const { error: removeError } = await db.from("questions").delete().eq("story_id", story.id);
  if (removeError) throw removeError;
  if (questions.length) {
    const rows: Question[] = questions.map((question, index) => ({ ...question, story_id: story.id, sort_order: index + 1 }));
    const { error: insertError } = await db.from("questions").insert(rows);
    if (insertError) throw insertError;
  }
}

export async function deleteStory(id: string): Promise<void> {
  const db = supabase();
  if (!db) {
    const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]") as string[];
    localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...deleted, id])]));
    localStorage.setItem(STORY_KEY, JSON.stringify(localStories().filter(story => story.id !== id)));
    return;
  }
  const { error } = await db.from("stories").delete().eq("id", id);
  if (error) throw error;
}

export async function getAttempts(): Promise<Attempt[]> {
  const db = supabase();
  const local = () => {
    try { return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "[]") as Attempt[]; }
    catch { return []; }
  };
  if (!db) return local();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return local();
  const { data, error } = await db.from("attempts").select("story_id, score, total, answers, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Attempt[];
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const db = supabase();
  const saveLocal = async () => {
    const existing = await getAttempts();
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify([attempt, ...existing]));
  };
  if (!db) return saveLocal();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return saveLocal();
  const { error } = await db.from("attempts").insert({ ...attempt, user_id: auth.user.id });
  if (error) throw error;
}

export async function getAccess(): Promise<{ email: string | null; admin: boolean }> {
  const db = supabase();
  if (!db) return { email: null, admin: true };
  const { data } = await db.auth.getUser();
  return { email: data.user?.email || null, admin: data.user?.app_metadata?.role === "admin" };
}

export async function signIn(email: string, password: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<boolean> {
  const db = supabase();
  if (!db) return true;
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;
  return Boolean(data.session);
}

export async function signOut(): Promise<void> {
  const db = supabase();
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

export function blankStory(month: number, day: number): Story {
  return {
    id: crypto.randomUUID(), month, day, title: "", summary: "", content: "", youtube_url: "", image_url: "",
    level: "Cơ bản", duration_minutes: 5, status: "draft", questions: [],
    activities: { cloze_text: "", true_false: [], short_answer: [], discussion: [] },
  };
}
