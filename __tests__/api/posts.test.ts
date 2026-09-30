jest.mock("@/lib/knowledge/lifecycle", () => require("../mocks/lifecycle"));
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockPost, mockExpertProfile, mockKnowledgeItem } from "../mocks/data";
import { createGET, createPOST, createPATCH, createDELETE } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/vector/indexer", () => ({
  indexDocument: jest.fn().mockResolvedValue(["vec-1"]),
  removeDocument: jest.fn().mockResolvedValue(undefined),
}));

import { GET as listPosts, POST as createPost } from "@/app/api/posts/route";
import {
  GET as getPost,
  PATCH as updatePost,
  DELETE as deletePost,
} from "@/app/api/posts/[postId]/route";
import { POST as toggleLike } from "@/app/api/posts/[postId]/like/route";
import { POST as toggleBookmark } from "@/app/api/posts/[postId]/bookmark/route";
import {
  GET as listComments,
  POST as createComment,
} from "@/app/api/posts/[postId]/comments/route";
import { POST as ragToggle } from "@/app/api/posts/[postId]/rag-toggle/route";
import { GET as getTrending } from "@/app/api/posts/trending/route";
import { syncKnowledgeItem as indexDocument, removeKnowledgeItem as removeDocument, syncPostSource } from "@/lib/knowledge/lifecycle";

// Helper to create params object matching Next.js app router pattern (Promise<{ postId: string }>)
function postParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}

beforeEach(() => {
  resetAllMocks();
  jest.clearAllMocks();
  mockAuth.mockReset();
  (indexDocument as jest.Mock).mockClear();
  (removeDocument as jest.Mock).mockClear();
});

// ---------------------------------------------------------------------------
// POST CRUD
// ---------------------------------------------------------------------------
describe("Post CRUD", () => {
  // 1. GET /posts - lists published posts for subscriber
  it("GET /posts - lists published posts for subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const postsData = [
      { ...mockPost, likes: [], bookmarks: [] },
    ];
    mockPrisma.post.findMany.mockResolvedValue(postsData);
    mockPrisma.post.count.mockResolvedValue(1);

    const req = createGET("/api/posts");
    const res = await listPosts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.pagination).toMatchObject({ page: 1, total: 1 });

    // Should filter to PUBLISHED + not hidden for non-own, non-admin
    const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({
      status: "PUBLISHED",
      isHidden: false,
    });
  });

  // 2. GET /posts?authorId=X - lists expert's own posts (including drafts)
  it("GET /posts?authorId=X - expert sees own posts including drafts", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const draftPost = { ...mockPost, status: "DRAFT", likes: [], bookmarks: [] };
    mockPrisma.post.findMany.mockResolvedValue([draftPost]);
    mockPrisma.post.count.mockResolvedValue(1);

    const req = createGET("/api/posts", {
      authorId: "expert-id-1",
      status: "DRAFT",
    });
    const res = await listPosts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);

    // When user is viewing own posts, status filter is applied directly (no forced PUBLISHED)
    const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
    expect(findManyCall.where.authorId).toBe("expert-id-1");
    expect(findManyCall.where.status).toBe("DRAFT");
    expect(findManyCall.where.isHidden).toBeUndefined();
  });

  // 3. POST /posts - expert creates post successfully
  it("POST /posts - expert creates post successfully", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const tagRecord = { id: "tag-1", name: "AI", slug: "ai", postCount: 1 };
    mockPrisma.tag.upsert.mockResolvedValue(tagRecord);

    const createdPost = {
      ...mockPost,
      id: "new-post-id",
    };
    mockPrisma.post.create.mockResolvedValue(createdPost);

    const req = createPOST("/api/posts", {
      content: "My first expert post",
      title: "Hello World",
      tags: ["AI"],
      media: [],
    });
    const res = await createPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("new-post-id");
    expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "ai" } })
    );
    expect(mockPrisma.post.create).toHaveBeenCalled();
  });

  // 4. POST /posts - subscriber cannot create posts (returns 403)
  it("POST /posts - subscriber cannot create posts", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/posts", {
      content: "Trying to post",
      tags: [],
      media: [],
    });
    const res = await createPost(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/experts/i);
  });

  // 5. POST /posts - unauthenticated returns 401
  it("POST /posts - unauthenticated returns 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/posts", {
      content: "No auth",
      tags: [],
      media: [],
    });
    const res = await createPost(req);

    expect(res.status).toBe(401);
  });

  // 6. POST /posts with isRagEnabled=true - creates post AND indexes in vector store
  it("POST /posts with isRagEnabled=true - indexes in vector store", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "AI", slug: "ai" });
    const createdPost = {
      ...mockPost,
      id: "rag-post-id",
      title: "RAG Post",
      content: "RAG content",
      isRagEnabled: true,
    };
    mockPrisma.post.create.mockResolvedValue(createdPost);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.create.mockResolvedValue({});

    const req = createPOST("/api/posts", {
      content: "RAG content",
      title: "RAG Post",
      isRagEnabled: true,
      tags: ["AI"],
      media: [],
    });
    const res = await createPost(req);

    expect(res.status).toBe(201);
    expect(syncPostSource).toHaveBeenCalledWith("rag-post-id");
  });

  // 7. GET /posts/:id - returns post detail with deduplicated view tracking
  it("GET /posts/:id - returns post detail with deduplicated views", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const postDetail = { ...mockPost, authorId: "expert-id-1", viewCount: 100, comments: [] };
    mockPrisma.post.findUnique.mockResolvedValue(postDetail);
    mockPrisma.like.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    // No existing view in last 24h — this is a new unique view
    mockPrisma.postView.findFirst.mockResolvedValue(null);
    mockPrisma.postView.create.mockResolvedValue({ id: "view-1" });
    mockPrisma.post.update.mockResolvedValue({ ...postDetail, viewCount: 101 });

    const req = createGET("/api/posts/post-id-1");
    const res = await getPost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.viewCount).toBe(100); // Returns current count, not incremented
    expect(json.isLiked).toBe(false);
    expect(json.isBookmarked).toBe(false);
  });

  // 7b. Author viewing own post does not increment view count
  it("GET /posts/:id - author view does not count", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const postDetail = { ...mockPost, authorId: "expert-id-1", viewCount: 100, comments: [] };
    mockPrisma.post.findUnique.mockResolvedValue(postDetail);
    mockPrisma.like.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);

    const req = createGET("/api/posts/post-id-1");
    const res = await getPost(req, postParams("post-id-1"));

    expect(res.status).toBe(200);
    // Author's view should NOT trigger postView.findFirst or create
    expect(mockPrisma.postView.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.postView.create).not.toHaveBeenCalled();
  });

  // 7c. Duplicate view within 24h does not increment
  it("GET /posts/:id - duplicate view within 24h is not counted", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const postDetail = { ...mockPost, authorId: "expert-id-1", viewCount: 100, comments: [] };
    mockPrisma.post.findUnique.mockResolvedValue(postDetail);
    mockPrisma.like.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    // Existing view found — already viewed within 24h
    mockPrisma.postView.findFirst.mockResolvedValue({ id: "existing-view" });

    const req = createGET("/api/posts/post-id-1");
    const res = await getPost(req, postParams("post-id-1"));

    expect(res.status).toBe(200);
    // Should check for existing view but NOT create a new one
    expect(mockPrisma.postView.findFirst).toHaveBeenCalled();
    expect(mockPrisma.postView.create).not.toHaveBeenCalled();
  });

  // 8. PATCH /posts/:id - author can update their post
  it("PATCH /posts/:id - author can update their post", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const updatedPost = { ...mockPost, title: "Updated Title" };
    mockPrisma.post.update.mockResolvedValue(updatedPost);

    const req = createPATCH("/api/posts/post-id-1", {
      title: "Updated Title",
      content: "Updated content",
    });
    const res = await updatePost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Updated Title");
  });

  // 9. PATCH /posts/:id - non-author cannot update (returns 403)
  it("PATCH /posts/:id - non-author cannot update", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    // Post belongs to expert, not subscriber
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);

    const req = createPATCH("/api/posts/post-id-1", {
      title: "Hacked Title",
    });
    const res = await updatePost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/author/i);
  });

  // 10. DELETE /posts/:id - author can delete
  it("DELETE /posts/:id - author can delete their post", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.post.findUnique.mockResolvedValue({ ...mockPost, isRagEnabled: false });
    mockPrisma.post.delete.mockResolvedValue(mockPost);

    const req = createDELETE("/api/posts/post-id-1");
    const res = await deletePost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
    expect(mockPrisma.post.delete).toHaveBeenCalledWith({
      where: { id: "post-id-1" },
    });
  });

  // 11. DELETE /posts/:id - admin can delete any post
  it("DELETE /posts/:id - admin can delete any post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    // Post belongs to expert, but admin should still be able to delete
    mockPrisma.post.findUnique.mockResolvedValue({ ...mockPost, isRagEnabled: false });
    mockPrisma.post.delete.mockResolvedValue(mockPost);

    const req = createDELETE("/api/posts/post-id-1");
    const res = await deletePost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
  });
});

// ---------------------------------------------------------------------------
// ENGAGEMENT
// ---------------------------------------------------------------------------
describe("Engagement", () => {
  // 12. POST /posts/:id/like - toggle like on (creates like)
  it("POST /posts/:id/like - toggle like on", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.like.findUnique.mockResolvedValue(null); // No existing like
    mockPrisma.like.create.mockResolvedValue({
      id: "like-1",
      userId: "subscriber-id-1",
      postId: "post-id-1",
    });
    mockPrisma.like.count.mockResolvedValue(6);

    const req = createPOST("/api/posts/post-id-1/like", {});
    const res = await toggleLike(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isLiked).toBe(true);
    expect(json.likeCount).toBe(6);
    expect(mockPrisma.like.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: "subscriber-id-1", postId: "post-id-1" },
      })
    );
  });

  // 13. POST /posts/:id/like - toggle like off (removes like)
  it("POST /posts/:id/like - toggle like off", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.like.findUnique.mockResolvedValue({
      id: "like-1",
      userId: "subscriber-id-1",
      postId: "post-id-1",
    });
    mockPrisma.like.delete.mockResolvedValue({});
    mockPrisma.like.count.mockResolvedValue(4);

    const req = createPOST("/api/posts/post-id-1/like", {});
    const res = await toggleLike(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isLiked).toBe(false);
    expect(json.likeCount).toBe(4);
    expect(mockPrisma.like.delete).toHaveBeenCalledWith({
      where: { id: "like-1" },
    });
  });

  // 14. POST /posts/:id/like - unauthenticated returns 401
  it("POST /posts/:id/like - unauthenticated returns 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/posts/post-id-1/like", {});
    const res = await toggleLike(req, postParams("post-id-1"));

    expect(res.status).toBe(401);
  });

  // 15. POST /posts/:id/bookmark - toggle bookmark on
  it("POST /posts/:id/bookmark - toggle bookmark on", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.create.mockResolvedValue({
      id: "bookmark-1",
      userId: "subscriber-id-1",
      postId: "post-id-1",
    });
    mockPrisma.bookmark.count.mockResolvedValue(3);

    const req = createPOST("/api/posts/post-id-1/bookmark", {});
    const res = await toggleBookmark(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBookmarked).toBe(true);
    expect(json.bookmarkCount).toBe(3);
    expect(mockPrisma.bookmark.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: "subscriber-id-1", postId: "post-id-1" },
      })
    );
  });

  // 16. POST /posts/:id/bookmark - toggle bookmark off
  it("POST /posts/:id/bookmark - toggle bookmark off", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.bookmark.findUnique.mockResolvedValue({
      id: "bookmark-1",
      userId: "subscriber-id-1",
      postId: "post-id-1",
    });
    mockPrisma.bookmark.delete.mockResolvedValue({});
    mockPrisma.bookmark.count.mockResolvedValue(1);

    const req = createPOST("/api/posts/post-id-1/bookmark", {});
    const res = await toggleBookmark(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBookmarked).toBe(false);
    expect(json.bookmarkCount).toBe(1);
    expect(mockPrisma.bookmark.delete).toHaveBeenCalledWith({
      where: { id: "bookmark-1" },
    });
  });
});

// ---------------------------------------------------------------------------
// COMMENTS
// ---------------------------------------------------------------------------
describe("Comments", () => {
  // 17. GET /posts/:id/comments - lists comments
  it("GET /posts/:id/comments - lists comments", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const commentsData = [
      {
        id: "comment-1",
        content: "Great post!",
        userId: "subscriber-id-1",
        postId: "post-id-1",
        parentId: null,
        createdAt: new Date("2024-01-02"),
        user: { id: "subscriber-id-1", name: "Subscriber User", image: null },
        replies: [],
      },
    ];
    mockPrisma.comment.findMany.mockResolvedValue(commentsData);

    const req = createGET("/api/posts/post-id-1/comments");
    const res = await listComments(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].content).toBe("Great post!");

    // Should only fetch root comments (parentId: null)
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId: "post-id-1", parentId: null },
      })
    );
  });

  // 18. POST /posts/:id/comments - creates comment
  it("POST /posts/:id/comments - creates comment", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const createdComment = {
      id: "comment-new",
      content: "Nice article!",
      userId: "subscriber-id-1",
      postId: "post-id-1",
      parentId: null,
      createdAt: new Date(),
      user: { id: "subscriber-id-1", name: "Subscriber User", image: null },
    };
    mockPrisma.comment.create.mockResolvedValue(createdComment);
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createPOST("/api/posts/post-id-1/comments", {
      content: "Nice article!",
    });
    const res = await createComment(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.content).toBe("Nice article!");

    // Should create notification for post author since commenter is not the author
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "expert-id-1", // post author
          title: "New Comment",
        }),
      })
    );
  });

  // 19. POST /posts/:id/comments - unauthenticated returns 401
  it("POST /posts/:id/comments - unauthenticated returns 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/posts/post-id-1/comments", {
      content: "Anonymous comment",
    });
    const res = await createComment(req, postParams("post-id-1"));

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// RAG TOGGLE
// ---------------------------------------------------------------------------
describe("RAG Toggle", () => {
  // 20. POST /posts/:id/rag-toggle - expert enables RAG
  it("POST /posts/:id/rag-toggle - expert enables RAG (indexes document)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const postWithRagOff = {
      ...mockPost,
      isRagEnabled: false,
      authorId: "expert-id-1",
    };
    mockPrisma.post.findUnique.mockResolvedValue(postWithRagOff);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.create.mockResolvedValue({});
    mockPrisma.post.update.mockResolvedValue({
      ...postWithRagOff,
      isRagEnabled: true,
    });

    const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
    const res = await ragToggle(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isRagEnabled).toBe(true);
    expect(json.message).toMatch(/added to knowledge base/i);

    expect(syncPostSource).toHaveBeenCalledWith("post-id-1");
  });

  // 21. POST /posts/:id/rag-toggle - expert disables RAG
  it("POST /posts/:id/rag-toggle - expert disables RAG (removes from vector store)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const postWithRagOn = {
      ...mockPost,
      isRagEnabled: true,
      authorId: "expert-id-1",
    };
    mockPrisma.post.findUnique.mockResolvedValue(postWithRagOn);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const knowledgeItemForPost = {
      ...mockKnowledgeItem,
      sourceType: "post",
      sourceId: "post-id-1",
      vectorIds: ["vec-1", "vec-2"],
    };
    mockPrisma.knowledgeItem.findFirst.mockResolvedValue(knowledgeItemForPost);
    mockPrisma.knowledgeItem.delete.mockResolvedValue({});
    mockPrisma.post.update.mockResolvedValue({
      ...postWithRagOn,
      isRagEnabled: false,
    });

    const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
    const res = await ragToggle(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isRagEnabled).toBe(false);
    expect(json.message).toMatch(/removed from knowledge base/i);

    expect(syncPostSource).toHaveBeenCalledWith("post-id-1");

  });

  // 22. POST /posts/:id/rag-toggle - non-author returns 403
  it("POST /posts/:id/rag-toggle - non-author returns 403", async () => {
    // Use a different expert session where the user id doesn't match post authorId
    const otherExpert = {
      user: {
        id: "other-expert-id",
        name: "Other Expert",
        email: "other@test.com",
        role: "EXPERT",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
    mockAuth.mockResolvedValue(otherExpert);

    mockPrisma.post.findUnique.mockResolvedValue({
      ...mockPost,
      authorId: "expert-id-1", // different from other-expert-id
    });

    const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
    const res = await ragToggle(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/author/i);
  });
});

// ---------------------------------------------------------------------------
// TRENDING
// ---------------------------------------------------------------------------
describe("Trending", () => {
  // 23. GET /posts/trending - returns trending posts
  it("GET /posts/trending - returns trending posts sorted by engagement", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const trendingPosts = [
      {
        ...mockPost,
        id: "trending-1",
        viewCount: 200,
        _count: { likes: 10, comments: 5, bookmarks: 3 },
        likes: [],
        bookmarks: [],
      },
      {
        ...mockPost,
        id: "trending-2",
        viewCount: 50,
        _count: { likes: 2, comments: 1, bookmarks: 1 },
        likes: [],
        bookmarks: [],
      },
    ];
    mockPrisma.post.findMany.mockResolvedValue(trendingPosts);

    const req = createGET("/api/posts/trending");
    const res = await getTrending();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);

    // First post should have higher engagement score
    // Score = viewCount + likes*3 + comments*2
    // trending-1: 200 + 10*3 + 5*2 = 240
    // trending-2: 50 + 2*3 + 1*2 = 58
    expect(json[0].engagementScore).toBe(240);
    expect(json[1].engagementScore).toBe(58);
    expect(json[0].isLiked).toBe(false);
    expect(json[0].isBookmarked).toBe(false);

    // Verify query filters
    const findManyCall = mockPrisma.post.findMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBe("PUBLISHED");
    expect(findManyCall.where.isHidden).toBe(false);
    expect(findManyCall.where.createdAt).toBeDefined();
  });
});
