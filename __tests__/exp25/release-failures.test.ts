/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewWorkspace } from "@/components/corrections/review-workspace";
import { readReviewRequest, ReviewRequestFailure, releaseFailureMessage } from "@/components/corrections/release-failure";

const receipt = "a".repeat(64);
const preview = { allowed: true, reason: null, currentHead: "head", targetId: null, sourceCount: 0, approvalHash: receipt, changes: [] };
const json = (value: unknown, status = 200) => ({ ok: status < 400, status, json: async () => value });
function setup(overrides: { preview?: unknown; activate?: () => Promise<unknown>; refreshFails?: boolean } = {}) {
  Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "same-operation") });
  let activated = false;
  const transport = jest.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/preview")) return json(overrides.preview ?? preview);
    if (options?.body) { const result = overrides.activate ? await overrides.activate() : json({ id: "new" }, 201); activated = true; return result; }
    if (activated && overrides.refreshFails) return json({ error: "private database detail" }, 503);
    if (url.endsWith("/persona-releases")) return json({ releases: [{ id: "private-release", createdAt: "2026-10-11", manifest: { sources: [] } }], heads: [{ releaseId: "head" }] });
    return json({ reviews: [], events: [], sources: [], truncated: false });
  });
  render(React.createElement(ReviewWorkspace as React.ComponentType<{transport?:typeof fetch}>, { transport: transport as unknown as typeof fetch }));
  return transport;
}
async function open() { fireEvent.click(await screen.findByRole("button", { name: "Create release" })); await screen.findByRole("button", { name: "Confirm new release" }); }

test.each([401, 403])("non-JSON %s preserves authorization status and removes private release data", async status => {
  setup({ activate: async () => ({ ok: false, status, json: async () => { throw new SyntaxError("HTML upstream"); } }) });
  await open(); fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Expert owner access required");
  expect(screen.queryByText("private-release")).toBeNull(); expect(screen.queryByRole("button", { name: "Confirm new release" })).toBeNull();
});
test("blocked V2 preview explains release readiness and cannot confirm", async () => {
  const transport = setup({ preview: { ...preview, allowed: false, approvalHash: null, reason: "V2 writes are gated pending a compatible downgrade target" } });
  await open(); expect(screen.getByRole("alert").textContent).toContain("Contact your administrator about release readiness");
  expect((screen.getByRole("button", { name: "Confirm new release" }) as HTMLButtonElement).disabled).toBe(true);
  expect(transport.mock.calls.filter(([, options]) => options?.body && JSON.parse(String(options.body)).operationKey)).toHaveLength(0);
});
test("ambiguous activation preserves the reviewed receipt and operation key for retry", async () => {
  let attempts = 0;
  const transport = setup({ activate: async () => { if (++attempts === 1) throw Error("secret host: database outage"); return json({ id: "new" }, 201); } });
  await open(); fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Activation could not be confirmed");
  expect(screen.queryByText(/secret host/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  await screen.findByText("Reviewed release activated. Source content and access remain live.");
  const writes = transport.mock.calls.filter(([, options]) => options?.body && JSON.parse(String(options.body)).operationKey);
  expect(writes).toHaveLength(2); expect(writes[0][1]?.body).toEqual(writes[1][1]?.body);
});
test("stale approval disables repeat writes until refresh and a new preview", async () => {
  const transport = setup({ activate: async () => json({ error: "Reviewed payload changed; preview again before approval" }, 409) });
  await open(); fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  await screen.findByRole("alert"); expect((screen.getByRole("button", { name: "Confirm new release" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Refresh reviews" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm new release" })).toBeNull());
  expect(transport.mock.calls.filter(([, options]) => options?.body && JSON.parse(String(options.body)).operationKey)).toHaveLength(1);
});
test.each([{ ...preview, approvalHash: null }, { ...preview, changes: null }, { ...preview, sourceCount: -1 }])("malformed preview does not render a confirmation or crash", async value => {
  setup({ preview: value }); fireEvent.click(await screen.findByRole("button", { name: "Create release" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Release verification is unavailable");
  expect(screen.queryByRole("button", { name: "Confirm new release" })).toBeNull();
});
test("confirmed activation with failed reload gives the distinct recovery instruction", async () => {
  setup({ refreshFails: true }); await open(); fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Release activated, but the latest reviews could not be loaded");
  expect(screen.queryByRole("button", { name: "Confirm new release" })).toBeNull();
});
test("malformed activation response stays ambiguous and retryable", async () => {
  setup({ activate: async () => json({ unexpected: "server payload" }, 201) }); await open(); fireEvent.click(screen.getByRole("button", { name: "Confirm new release" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Activation could not be confirmed");
  expect(screen.queryByText("Reviewed release activated. Source content and access remain live.")).toBeNull();
});
test("non-JSON success is a failed verification response", async () => {
  await expect(readReviewRequest("/preview", {}, "POST", (async () => ({ ok: true, status: 200, json: async () => { throw Error("bad"); } })) as unknown as typeof fetch)).rejects.toMatchObject({ status: 502 });
});
test.each([
  ["Sources still require recomputation", "Open knowledge settings"],
  ["Every source must have a current supported evidence revision before release", "current evidence"],
  ["Rollback evidence is no longer current; create a new release", "cannot restore removed or restricted access"],
  ["Rollback cannot change current RAG permission", "current evidence and access permissions"],
  ["Rollback algorithm is unsupported", "Contact your administrator"],
  ["Rollback runtime or greeting capsule is unsupported", "unsupported release safe"],
  ["Current release is invalid or unsupported", "could not be verified"],
])("known invariant has concrete guidance: %s", (reason, guidance) => {
  expect(releaseFailureMessage(new ReviewRequestFailure(409, reason), "preview")).toContain(guidance);
});
