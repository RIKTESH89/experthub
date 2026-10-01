import type { NextAuthConfig } from "next-auth";
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
const mockNextAuth = jest.fn(() => ({ auth: jest.fn(), handlers: {}, signIn: jest.fn(), signOut: jest.fn() }));
jest.mock("next-auth", () => ({ __esModule: true, default: mockNextAuth }));
jest.mock("next-auth/providers/google", () => ({ __esModule: true, default: () => ({ id: "google" }) }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
import "@/lib/auth";
const config = (mockNextAuth.mock.calls as unknown[][])[0][0] as NextAuthConfig;
const jwt = config.callbacks!.jwt!;
const signIn = config.callbacks!.signIn!;
beforeEach(() => resetAllMocks());
test.each([null, { role: "ADMIN", isBanned: true, isActive: true }, { role: "ADMIN", isBanned: false, isActive: false }])("existing token fails closed for missing/banned/inactive account %p", async current => {
  mockPrisma.user.findUnique.mockResolvedValue(current);
  const token = await jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0]);
  expect(token).toBeNull();
});
test.each(["EXPERT", "SUBSCRIBER"])("existing token reads current %s role immediately", async role => {
  mockPrisma.user.findUnique.mockResolvedValue({ role, isBanned: false, isActive: true });
  expect(await jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0])).toMatchObject({ id: "synthetic-user", role });
  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "synthetic-user" }, select: { role: true, isBanned: true, isActive: true } });
});
test("database outage does not preserve stale authorization", async () => {
  mockPrisma.user.findUnique.mockRejectedValue(new Error("unavailable"));
  await expect(jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0])).rejects.toThrow("unavailable");
});
test("Google email must be verified before identity creation or linking", async () => {
  expect(await signIn({ account: { provider: "google" }, user: { email: "synthetic@example.invalid" }, profile: { email_verified: false } } as Parameters<typeof signIn>[0])).toBe(false);
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.user.create).not.toHaveBeenCalled();
});
