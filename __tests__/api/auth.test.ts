import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers } from "../mocks/data";
import { createPOST, createGET, createPATCH } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashed"),
  compare: jest.fn().mockResolvedValue(true),
}));

import { POST as registerPOST } from "@/app/api/auth/register/route";
import { GET as meGET, PATCH as mePATCH } from "@/app/api/users/me/route";

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Registration Flow
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  const validSubscriber = {
    name: "New Subscriber",
    email: "newsub@test.com",
    password: "password123",
    role: "SUBSCRIBER",
  };

  const validExpert = {
    name: "New Expert",
    email: "newexpert@test.com",
    password: "password123",
    role: "EXPERT",
  };

  // 1. Successful subscriber registration
  it("creates a subscriber and returns user without password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const createdUser = {
      id: "new-sub-id",
      name: validSubscriber.name,
      email: validSubscriber.email,
      hashedPassword: "$2a$12$hashed",
      role: "SUBSCRIBER",
      bio: null,
      headline: null,
      image: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      expertProfile: null,
    };
    mockPrisma.user.create.mockResolvedValue(createdUser);

    const req = createPOST("/api/auth/register", validSubscriber);
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(validSubscriber.email);
    expect(body.user.name).toBe(validSubscriber.name);
    expect(body.user.role).toBe("SUBSCRIBER");
    // Password must not be exposed
    expect(body.user.hashedPassword).toBeUndefined();

    // Verify prisma calls
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: validSubscriber.email },
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: validSubscriber.name,
          email: validSubscriber.email,
          hashedPassword: "$2a$12$hashed",
          role: "SUBSCRIBER",
        }),
        include: { expertProfile: true },
      })
    );
    // No expertProfile update for subscribers
    expect(mockPrisma.expertProfile.update).not.toHaveBeenCalled();
  });

  // 2. Successful expert registration - creates user AND expert profile
  it("creates an expert with an expert profile and updates vectorNamespace", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const expertProfile = {
      id: "profile-new-id",
      userId: "new-expert-id",
      displayName: validExpert.name,
      vectorNamespace: "expert_temp",
    };
    const createdUser = {
      id: "new-expert-id",
      name: validExpert.name,
      email: validExpert.email,
      hashedPassword: "$2a$12$hashed",
      role: "EXPERT",
      bio: null,
      headline: null,
      image: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      expertProfile,
    };
    mockPrisma.user.create.mockResolvedValue(createdUser);
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...expertProfile,
      vectorNamespace: "expert_new-expert_new-expe",
    });

    const req = createPOST("/api/auth/register", validExpert);
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toBeDefined();
    expect(body.user.role).toBe("EXPERT");
    expect(body.user.expertProfile).toBeDefined();
    expect(body.user.hashedPassword).toBeUndefined();

    // Verify expert profile was included in create
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "EXPERT",
          expertProfile: {
            create: {
              displayName: validExpert.name,
              vectorNamespace: "expert_temp",
            },
          },
        }),
      })
    );

    // Verify vectorNamespace was updated with slugified name + id prefix
    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { id: expertProfile.id },
      data: {
        vectorNamespace: `expert_new-expert_${createdUser.id.slice(0, 8)}`,
      },
    });
  });

  // 3. Registration with existing email
  it("returns 409 when email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);

    const req = createPOST("/api/auth/register", {
      ...validSubscriber,
      email: mockUsers.subscriber.email,
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toBe("An account with this email already exists");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  // 4. Registration with missing fields
  it("returns 400 when required fields are missing", async () => {
    const req = createPOST("/api/auth/register", {
      email: "test@test.com",
      // missing name, password, role
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBeDefined();
    expect(body.details).toBeDefined();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  // 4b. Registration with short password
  it("returns 400 when password is too short", async () => {
    const req = createPOST("/api/auth/register", {
      ...validSubscriber,
      password: "short",
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("Password must be at least 8 characters");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  // 5. Registration with invalid role
  it("returns 400 when role is invalid", async () => {
    const req = createPOST("/api/auth/register", {
      ...validSubscriber,
      role: "INVALID_ROLE",
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBeDefined();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// User Profile Flow - GET /api/users/me
// ---------------------------------------------------------------------------
describe("GET /api/users/me", () => {
  // 6. Returns current user profile when authenticated
  it("returns the authenticated user profile", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const userProfile = {
      id: mockUsers.subscriber.id,
      name: mockUsers.subscriber.name,
      email: mockUsers.subscriber.email,
      image: null,
      role: "SUBSCRIBER",
      bio: mockUsers.subscriber.bio,
      headline: mockUsers.subscriber.headline,
      isActive: true,
      createdAt: mockUsers.subscriber.createdAt,
      expertProfile: null,
    };
    mockPrisma.user.findUnique.mockResolvedValue(userProfile);

    const req = createGET("/api/users/me");
    const res = await meGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(mockUsers.subscriber.id);
    expect(body.name).toBe(mockUsers.subscriber.name);
    expect(body.email).toBe(mockUsers.subscriber.email);
    expect(body.role).toBe("SUBSCRIBER");
    expect(body.bio).toBe(mockUsers.subscriber.bio);
    expect(body.headline).toBe(mockUsers.subscriber.headline);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockSession.subscriber.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true,
        headline: true,
        isActive: true,
        createdAt: true,
        expertProfile: true,
      },
    });
  });

  // 7. Returns 401 when not authenticated
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await meGET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found in database", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await meGET();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});

// ---------------------------------------------------------------------------
// User Profile Flow - PATCH /api/users/me
// ---------------------------------------------------------------------------
describe("PATCH /api/users/me", () => {
  // 8. Updates user name, bio, headline
  it("updates user name, bio, and headline", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const updateData = {
      name: "Updated Name",
      bio: "Updated bio text",
      headline: "Updated Headline",
    };

    const updatedUser = {
      id: mockUsers.subscriber.id,
      name: updateData.name,
      email: mockUsers.subscriber.email,
      image: null,
      role: "SUBSCRIBER",
      bio: updateData.bio,
      headline: updateData.headline,
      isActive: true,
      createdAt: mockUsers.subscriber.createdAt,
      expertProfile: null,
    };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const req = createPATCH("/api/users/me", updateData);
    const res = await mePATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe(updateData.name);
    expect(body.bio).toBe(updateData.bio);
    expect(body.headline).toBe(updateData.headline);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: mockSession.subscriber.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true,
        headline: true,
        isActive: true,
        createdAt: true,
        expertProfile: true,
      },
    });
  });

  // 9. Returns 401 when not authenticated
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPATCH("/api/users/me", { name: "Hacker" });
    const res = await mePATCH(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 400 when validation fails", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    // name must be at least 2 characters
    const req = createPATCH("/api/users/me", { name: "A" });
    const res = await mePATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("allows partial updates with only one field", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const updatedUser = {
      id: mockUsers.expert.id,
      name: mockUsers.expert.name,
      email: mockUsers.expert.email,
      image: null,
      role: "EXPERT",
      bio: "Only bio updated",
      headline: mockUsers.expert.headline,
      isActive: true,
      createdAt: mockUsers.expert.createdAt,
      expertProfile: mockUsers.expert.expertProfile,
    };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const req = createPATCH("/api/users/me", { bio: "Only bio updated" });
    const res = await mePATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.bio).toBe("Only bio updated");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bio: "Only bio updated" },
      })
    );
  });
});
