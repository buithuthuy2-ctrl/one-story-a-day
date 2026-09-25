import { StoryApp } from "@/components/story-app";

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  return <StoryApp view="month" month={Number(month)} />;
}
