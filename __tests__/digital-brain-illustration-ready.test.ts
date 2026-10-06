/** @jest-environment jsdom */
import { decodePoster, nextFrame } from "../src/components/home/digital-brain/illustration-ready";

function image(decode: () => Promise<void>, width = 780, height = 820) {
  const result = document.createElement("img");
  result.src = "/brain.png"; result.dataset.posterSrc = "/brain.png";
  Object.defineProperties(result, { decode: { configurable: true, value: decode }, naturalWidth: { value: width }, naturalHeight: { value: height } });
  return result;
}
test("cached decoded pixels are ready without waiting for another load event", async () => {
  const decode = jest.fn().mockResolvedValue(undefined);
  await expect(decodePoster(image(decode), new AbortController().signal)).resolves.toBeUndefined();
  expect(decode).toHaveBeenCalledTimes(1);
});
test("fetch/load completion does not reveal before pixel decode resolves", async () => {
  let finish!: () => void;
  let ready = false;
  const pending = decodePoster(image(() => new Promise(resolve => { finish = resolve; })), new AbortController().signal).then(() => { ready = true; });
  await Promise.resolve(); expect(ready).toBe(false);
  finish(); await pending; expect(ready).toBe(true);
});
test.each([[0,820],[780,0]])("decode with missing pixel dimensions %s x %s fails", async (width,height) => {
  await expect(decodePoster(image(() => Promise.resolve(), width, height), new AbortController().signal)).rejects.toThrow("unavailable");
});
test("decode failure remains a failure", async () => {
  await expect(decodePoster(image(() => Promise.reject(new Error("broken poster"))), new AbortController().signal)).rejects.toThrow("broken poster");
});
test("abort rejects promptly and late decode cannot become success", async () => {
  let finish!: () => void; const controller = new AbortController();
  const pending = decodePoster(image(() => new Promise(resolve => { finish = resolve; })), controller.signal);
  await Promise.resolve();
  controller.abort(); await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  finish(); await Promise.resolve();
});
test("abort before decode starts never invokes the decoder", async () => {
  const decode = jest.fn().mockResolvedValue(undefined), controller = new AbortController();
  const pending = decodePoster(image(decode), controller.signal);
  controller.abort(); await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(decode).not.toHaveBeenCalled();
});
test("retry requests the same poster with a fresh retry key", async () => {
  const poster = image(() => Promise.resolve());
  await decodePoster(poster, new AbortController().signal, 2);
  expect(new URL(poster.src).pathname).toBe("/brain.png");
  expect(new URL(poster.src).searchParams.get("illustration-retry")).toBe("2");
});
test("aborted next paint cancels its owned frame", async () => {
  const raf = jest.spyOn(window, "requestAnimationFrame").mockReturnValue(23);
  const cancel = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  try {
    const controller = new AbortController(), pending = nextFrame(controller.signal);
    controller.abort(); await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledWith(23);
  } finally { raf.mockRestore(); cancel.mockRestore(); }
});
test("ready paint removes its cancellation listener", async () => {
  let paint!: FrameRequestCallback;
  const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { paint = callback; return 7; });
  try {
    const controller = new AbortController(), remove = jest.spyOn(controller.signal, "removeEventListener");
    const pending = nextFrame(controller.signal); paint(0); await pending;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  } finally { raf.mockRestore(); }
});
