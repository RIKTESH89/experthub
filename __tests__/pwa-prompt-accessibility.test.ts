/** @jest-environment jsdom */
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  window.matchMedia = jest.fn().mockReturnValue({matches:false});
});
afterEach(() => { cleanup(); jest.useRealTimers(); });

it("places the install suggestion in document flow with named dismissal", () => {
  render(createElement(PWAInstallPrompt));
  act(() => jest.advanceTimersByTime(5000));
  const suggestion = screen.getByRole("complementary", {name:"Install ExpertHub"});
  expect(suggestion.className).toContain("relative");
  expect(suggestion.className).not.toContain("fixed");
  fireEvent.click(screen.getByRole("button", {name:"Dismiss install suggestion"}));
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(localStorage.getItem("pwa-install-dismissed")).toBeTruthy();
});

it("opens a labeled manual dialog only after an explicit action", () => {
  render(createElement(PWAInstallPrompt));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"Install App"}));
  expect(screen.getByRole("dialog", {name:"Install ExpertHub"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:"Got it"}));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("does not reopen after an early native event was dismissed", () => {
  render(createElement(PWAInstallPrompt));
  const event = new Event("beforeinstallprompt", {cancelable:true});
  Object.assign(event, {prompt:jest.fn(), userChoice:Promise.resolve({outcome:"dismissed"})});
  act(() => window.dispatchEvent(event));
  fireEvent.click(screen.getByRole("button", {name:"Not now"}));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByRole("complementary")).toBeNull();
});

it("does not show suggestions for installed or recently dismissed apps", () => {
  window.matchMedia = jest.fn().mockReturnValue({matches:true});
  const view = render(createElement(PWAInstallPrompt));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByRole("complementary")).toBeNull();
  view.unmount();
  window.matchMedia = jest.fn().mockReturnValue({matches:false});
  localStorage.setItem("pwa-install-dismissed",Date.now().toString());
  render(createElement(PWAInstallPrompt));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByRole("complementary")).toBeNull();
});
