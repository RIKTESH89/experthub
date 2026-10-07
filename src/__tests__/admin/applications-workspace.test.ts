/** @jest-environment jsdom */
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminApplicationsWorkspace } from "@/components/admin/applications-workspace";
import { toast } from "sonner";
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/ui/motion", () => {
  const Wrapper = ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("div", props, children);
  return { PageTransition: Wrapper, StaggerContainer: Wrapper, StaggerItem: Wrapper, AnimatedCounter: ({ value }: { value: number }) => React.createElement("span", null, value), motion: { div: Wrapper }, AnimatePresence: Wrapper };
});
const application = { id: "synthetic-id", name: "Sam Example", email: "sam@example.invalid", specialty: "Knowledge systems", reason: "Synthetic", status: "PENDING", createdAt: "2026-10-07T00:00:00Z" };
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body }) as Response;
const open = async (transport: typeof fetch) => {
  render(React.createElement(AdminApplicationsWorkspace, { transport }));
  const trigger = await screen.findByRole("button", { name: "Approve" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};
afterEach(cleanup);
it("shows applicant identity and grants no access before confirmation or after cancel", async () => {
  const transport = jest.fn().mockResolvedValue(response({ applications: [application] }));
  const trigger = await open(transport);
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText(application.email)).toBeTruthy();
  expect(within(dialog).getByText(/Approval grants expert access/)).toBeTruthy();
  expect(transport).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(document.activeElement).toBe(trigger);
  expect(transport).toHaveBeenCalledTimes(1);
});
it("Escape cancels without sending a PATCH", async () => {
  const transport = jest.fn().mockResolvedValue(response({ applications: [application] }));
  await open(transport);
  fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(transport).toHaveBeenCalledTimes(1);
});
it("serializes confirmation, disables cancel and escape while pending, and shows confirmed success", async () => {
  let resolve!: (value: Response) => void;
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  await open(transport);
  const confirm = screen.getByRole("button", { name: "Confirm approval" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport).toHaveBeenLastCalledWith("/api/admin/expert-applications/synthetic-id", expect.objectContaining({ method: "PATCH", body: '{"action":"approve"}' }));
  expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  await act(async () => resolve(response({ status: "APPROVED" })));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  expect(toast.success).toHaveBeenCalledWith("Application approved.");
  expect(document.activeElement?.textContent).toBe("Expert Applications");
});
it.each([400, 401, 403, 500])("requires status refresh after an HTTP %i approval failure", async status => {
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockResolvedValueOnce(response({ error: "Synthetic failure" }, status)).mockResolvedValueOnce(response({ applications: [application] })).mockResolvedValueOnce(response({ status: "APPROVED" }));
  await open(transport);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByRole("alert");
  expect((screen.getByRole("button", { name: "Confirm approval" }) as HTMLButtonElement).disabled).toBe(true);
  expect(toast.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh application status" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Confirm approval" }) as HTMLButtonElement).disabled).toBe(false));
  expect(transport).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(transport).toHaveBeenCalledTimes(4);
});
it("an uncertain transport error refreshes already-approved status without repeating approval", async () => {
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce(response({ applications: [{ ...application, status: "APPROVED" }] }));
  await open(transport);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Refresh application status" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(transport.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
});
it("does not accept an unconfirmed success response", async () => {
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockResolvedValueOnce(response({}));
  await open(transport);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByText(/server did not confirm/);
  expect(toast.success).not.toHaveBeenCalled();
});
it("shows load failure instead of a false empty state", async () => {
  render(React.createElement(AdminApplicationsWorkspace, { transport: jest.fn().mockResolvedValue(response({}, 403)) }));
  await screen.findByRole("alert");
  expect(screen.queryByText("No applications yet")).toBeNull();
});
it("cannot bypass an uncertain approval by cancelling and reopening the dialog", async () => {
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockRejectedValueOnce(new Error("Connection lost"));
  await open(transport);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  expect((screen.getByRole("button", { name: "Confirm approval" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Refresh application status" })).toBeTruthy();
  expect(transport).toHaveBeenCalledTimes(2);
});
it.each([response({}, 500), response({ applications: [] })])("keeps approval disabled when refresh cannot establish status", async refreshed => {
  const transport = jest.fn().mockResolvedValueOnce(response({ applications: [application] })).mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce(refreshed);
  await open(transport);
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Refresh application status" }));
  await waitFor(() => expect(transport).toHaveBeenCalledTimes(3));
  await waitFor(() => expect((screen.getByRole("button", { name: "Refresh application status" }) as HTMLButtonElement).disabled).toBe(false));
  expect((screen.getByRole("button", { name: "Confirm approval" }) as HTMLButtonElement).disabled).toBe(true);
});
