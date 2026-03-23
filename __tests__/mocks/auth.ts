export const mockSession = {
  admin: {
    user: { id: "admin-id-1", name: "Admin User", email: "admin@test.com", role: "ADMIN" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  expert: {
    user: { id: "expert-id-1", name: "Expert User", email: "expert@test.com", role: "EXPERT" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  subscriber: {
    user: { id: "subscriber-id-1", name: "Subscriber User", email: "subscriber@test.com", role: "SUBSCRIBER" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
};

export const mockAuth = jest.fn();
