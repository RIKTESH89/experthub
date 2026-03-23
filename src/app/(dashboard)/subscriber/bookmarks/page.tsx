"use client";

import { PostFeed } from "@/components/posts/post-feed";

export default function SubscriberBookmarksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-indigo-900">Bookmarks</h2>
          <p className="mt-1 text-sm text-indigo-600/70">
            Your saved posts
          </p>
        </div>
        <svg className="hidden sm:block" width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Card stack */}
          <rect x="10" y="20" width="60" height="70" rx="6" fill="#e0e7ff" stroke="#8b5cf6" strokeWidth="1" opacity="0.5" />
          <rect x="20" y="12" width="60" height="70" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
          <rect x="30" y="28" width="36" height="4" rx="2" fill="#ddd6fe" />
          <rect x="30" y="38" width="42" height="3" rx="1.5" fill="#ddd6fe" />
          <rect x="30" y="46" width="38" height="3" rx="1.5" fill="#ddd6fe" />
          <rect x="30" y="54" width="40" height="3" rx="1.5" fill="#ddd6fe" />
          {/* Bookmark ribbon */}
          <path d="M90 5V42L100 34L110 42V5" fill="#6366f1" />
          <path d="M90 5V42L100 34L110 42V5" stroke="#4f46e5" strokeWidth="1.2" />
          {/* Small bookmark */}
          <path d="M115 55V75L121 70L127 75V55" fill="#8b5cf6" opacity="0.5" />
          {/* Star */}
          <path d="M120 30L122.5 36L129 36L124 40L125.5 46L120 42.5L114.5 46L116 40L111 36L117.5 36Z" fill="#8b5cf6" opacity="0.4" />
        </svg>
      </div>

      <PostFeed
        endpoint="/api/subscriber/bookmarks"
        emptyTitle="No bookmarks yet"
        emptyDescription="Bookmark posts to save them here for easy access later."
      />
    </div>
  );
}
