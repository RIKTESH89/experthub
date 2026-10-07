/** @jest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminAnalyticsWorkspace } from "@/components/admin/analytics-workspace";
const summary = { totalUsers: 12, activeExperts: 3, totalSubscribers: 5, activeSubscriptions: 4, totalPosts: 21, postsPerDay: { "2026-10-06": 3 } };
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body }) as Response;
afterEach(cleanup);
it("renders only supported summary counts and labels unsupported reports unavailable", async () => {
  const transport = jest.fn().mockResolvedValue(response({ ...summary, subscriptionRevenue: 99999 }));
  render(React.createElement(AdminAnalyticsWorkspace, { transport }));
  await screen.findByText("User accounts");
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("21")).toBeTruthy();
  expect(screen.queryByText(/99,999/)).toBeNull();
  expect(screen.getByText(/Revenue reporting is unavailable/)).toBeTruthy();
  expect(transport).toHaveBeenCalledWith("/api/admin/analytics", expect.objectContaining({ cache: "no-store" }));
});
it("distinguishes real zero counts from unavailable data", async () => {
  const body = { ...summary, totalUsers: 0, activeExperts: 0, totalSubscribers: 0, activeSubscriptions: 0, totalPosts: 0, postsPerDay: {} };
  render(React.createElement(AdminAnalyticsWorkspace, { transport: jest.fn().mockResolvedValue(response(body)) }));
  await screen.findByText("No accounts, subscriptions or posts are recorded yet.");
  expect(screen.getByText("No posts recorded in this period.")).toBeTruthy();
});
it.each([401, 403, 500])("shows unavailable without invented counts for HTTP %i", async status => {
  render(React.createElement(AdminAnalyticsWorkspace, { transport: jest.fn().mockResolvedValue(response({}, status)) }));
  await screen.findByRole("alert");
  expect(screen.queryByText("User accounts")).toBeNull();
});
it("rejects incomplete data and supports retry", async () => {
  const transport = jest.fn().mockResolvedValueOnce(response({ totalUsers: 12 })).mockResolvedValueOnce(response(summary));
  render(React.createElement(AdminAnalyticsWorkspace, { transport }));
  await screen.findByRole("alert");
  expect(screen.queryByText("User accounts")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh summary" }));
  await screen.findByText("User accounts");
  expect(transport).toHaveBeenCalledTimes(2);
});
it("does not show counts during loading or issue repeat refresh requests", async () => {
  let resolve!: (value: Response) => void;
  const transport = jest.fn(() => new Promise<Response>(done => { resolve = done; }));
  render(React.createElement(AdminAnalyticsWorkspace, { transport }));
  expect(screen.getByRole("status").textContent).toContain("Loading");
  fireEvent.click(screen.getByRole("button", { name: "Refresh summary" }));
  expect(transport).toHaveBeenCalledTimes(1);
  resolve(response(summary));
  await waitFor(() => expect(screen.getByText("User accounts")).toBeTruthy());
});
