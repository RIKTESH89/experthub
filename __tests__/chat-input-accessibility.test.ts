/** @jest-environment jsdom */
import { createElement } from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { ChatInput } from "@/components/chat/chat-input";

afterEach(cleanup);

it("does not send Enter while the user is composing an IME character", () => {
  const onSend = jest.fn();
  render(createElement(ChatInput, { onSend }));
  const input = screen.getByRole("textbox", { name: "Message to Digital Twin" });
  fireEvent.change(input, { target: { value: "日本語" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(onSend).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter", isComposing: false });
  expect(onSend).toHaveBeenCalledWith("日本語");
});

it("keeps the same send button across edits and describes the input", () => {
  render(createElement(ChatInput, { onSend: jest.fn() }));
  const input = screen.getByRole("textbox", { name: "Message to Digital Twin" });
  const button = screen.getByRole("button", { name: "Send message" });
  fireEvent.change(input, { target: { value: "Question" } });
  expect(screen.getByRole("button", { name: "Send message" })).toBe(button);
  const helpId = input.getAttribute("aria-describedby");
  expect(helpId && document.getElementById(helpId)?.textContent).toContain("Shift+Enter");
});

it("preserves Shift+Enter for multiline input and blocks disabled sends", () => {
  const onSend = jest.fn();
  render(createElement(ChatInput, { onSend, isDisabled: true }));
  const input = screen.getByRole("textbox", { name: "Message to Digital Twin" });
  fireEvent.change(input, { target: { value: "Question" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onSend).not.toHaveBeenCalled();
});
