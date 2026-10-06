const aborted = () => new DOMException("Illustration loading cancelled", "AbortError");
const assertActive = (signal: AbortSignal) => { if (signal.aborted) throw signal.reason || aborted(); };

export async function decodePoster(image: HTMLImageElement, signal: AbortSignal, retry = 0) {
  assertActive(signal);
  if (retry) {
    const url = new URL(image.dataset.posterSrc || image.src, location.href);
    url.searchParams.set("illustration-retry", String(retry));
    image.src = url.href;
  }
  let cancel: () => void = () => {};
  const cancellation = new Promise<never>((_, reject) => {
    cancel = () => reject(signal.reason || aborted());
    signal.addEventListener("abort", cancel, { once: true });
  });
  const decoded = Promise.resolve().then(() => {
    assertActive(signal);
    return typeof image.decode === "function" ? image.decode() : new Promise<void>((resolve, reject) => {
      const clean = () => { image.removeEventListener("load", loaded); image.removeEventListener("error", failed); signal.removeEventListener("abort", clean); };
      const loaded = () => { clean(); resolve(); };
      const failed = () => { clean(); reject(new Error("Illustration image unavailable")); };
      if (image.complete) {
        if (image.naturalWidth) loaded(); else failed();
        return;
      }
      image.addEventListener("load", loaded, { once: true }); image.addEventListener("error", failed, { once: true });
      signal.addEventListener("abort", clean, { once: true });
    });
  });
  try {
    await Promise.race([decoded, cancellation]);
    assertActive(signal);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Illustration image unavailable");
  } finally { signal.removeEventListener("abort", cancel); }
}

export function nextFrame(signal: AbortSignal) {
  assertActive(signal);
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { cancelAnimationFrame(frame); signal.removeEventListener("abort", cancel); reject(signal.reason || aborted()); };
    const frame = requestAnimationFrame(() => { signal.removeEventListener("abort", cancel); resolve(); });
    signal.addEventListener("abort", cancel, { once: true });
  });
}
