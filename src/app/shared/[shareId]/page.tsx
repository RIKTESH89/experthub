import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { SharedConversationView } from "@/components/shared/shared-conversation-view";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

async function getSharedConversation(shareId: string) {
  return prisma.sharedConversation.findUnique({
    where: { shareId, isActive: true },
    include: {
      chatSession: {
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          expertProfile: {
            include: {
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const shared = await getSharedConversation(shareId);
  if (!shared) return { title: "Conversation Not Found" };

  const expertName = shared.chatSession.expertProfile.displayName;
  const firstQuestion =
    shared.chatSession.messages.find((m) => m.role === "user")?.content ?? "";

  return {
    title: `Conversation with ${expertName}'s Digital Twin`,
    description: firstQuestion.slice(0, 160),
    openGraph: {
      title: `${expertName}'s Digital Twin`,
      description: firstQuestion.slice(0, 160),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${expertName}'s Digital Twin`,
      description: firstQuestion.slice(0, 160),
    },
  };
}

export default async function SharedConversationPage({ params }: PageProps) {
  const { shareId } = await params;
  const shared = await getSharedConversation(shareId);
  if (!shared) notFound();

  const expert = shared.chatSession.expertProfile;
  const messages = shared.chatSession.messages;

  return <SharedConversationView expert={expert} messages={messages} />;
}
