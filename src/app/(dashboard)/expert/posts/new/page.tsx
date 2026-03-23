"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostComposer } from "@/components/posts/post-composer";
import { Button } from "@/components/ui/button";

export default function ExpertNewPostPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expert/posts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create New Post</h2>
          <p className="text-sm text-muted-foreground">
            Share your expertise with your subscribers
          </p>
        </div>
      </div>

      <PostComposer
        authorName={session?.user?.name ?? "Expert"}
        authorImage={session?.user?.image}
        onPostCreated={() => router.push("/expert/posts")}
      />
    </div>
  );
}
