import { StoryApp } from "@/components/story-app";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryApp view="story" storyId={id} />;
}
