// Camera/target choreography adapted from JosephASG's Cinematic3DScroll variant 2.
// Its percentage scene timeline is normalized here with shared caption holds.
// MIT grant and upstream provenance: /uploads/digital-brain-foundation/CREDITS.md.
export const chapters = [
  { id: "introduction", label: "ExpertHub", title: "Give your knowledge a new way to speak.", body: "An AI Digital Twin, shaped by the work you choose to share.", side: "left", yaw: 0.32, pitch: 0.12, distance: 2.2, screenX: 0.69 },
  { id: "contributions", label: "Share", title: "Begin with what you’ve put into words.", body: "Bring together your notes, PDFs, blog articles and posts.", side: "left", yaw: 1.2, pitch: 0.29, distance: 2.04, screenX: 0.69 },
  { id: "context", label: "Connect", title: "An idea means more in context.", body: "Selected passages and related ideas keep the question connected to your work.", side: "right", yaw: 2.25, pitch: 0.10, distance: 2.15, screenX: 0.31 },
  { id: "construction", label: "Represent", title: "Your shared knowledge, taking a new shape.", body: "One AI representation. Built from what you contribute, with the sources kept distinct.", side: "left", yaw: 3.35, pitch: 0.34, distance: 2.1, screenX: 0.69 },
  { id: "conversation", label: "Ask", title: "Ask a question. Follow the answer back.", body: "Explore an answer, ask a follow-up and check its available sources.", side: "right", yaw: 4.45, pitch: -0.12, distance: 2.07, screenX: 0.31 },
  { id: "control", label: "Keep it current", title: "You shape what it represents.", body: "Add new material and manually correct your shared notes as your thinking changes.", side: "left", yaw: 5.5, pitch: 0.25, distance: 2.18, screenX: 0.69 },
  { id: "close", label: "Start a conversation", title: "What you know can start a conversation.", body: "Learn from an expert’s Digital Twin, or apply to share your own expertise.", side: "left", yaw: 6.6, pitch: 0.12, distance: 2.2, screenX: 0.69 },
] as const;

export type Pose = { yaw: number; pitch: number; distance: number; screenX: number };
const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

// A chapter occupies one interval: 72% reading hold, 28% camera transition.
// Caption exit, a text-free orbit, then caption entry share that same interval.
// No direction-dependent state, timers or accumulated rotation: reverse is exact.
export function evaluateStory(progress: number) {
  const position = clamp(progress) * chapters.length;
  const index = Math.min(Math.floor(position), chapters.length - 1);
  const fraction = position - index;
  const current = chapters[index];
  const next = chapters[Math.min(index + 1, chapters.length - 1)];
  const cameraMix = smooth(clamp((fraction - 0.72) / 0.28));
  const interpolate = (key: keyof Pose) => current[key] + (next[key] - current[key]) * cameraMix;
  const nextVisible = fraction > 0.91 && index < chapters.length - 1;
  const captionIndex = nextVisible ? index + 1 : index;
  const opacity = index === chapters.length - 1 ? 1 : nextVisible ? smooth(clamp((fraction - 0.91) / 0.09)) : 1 - smooth(clamp((fraction - 0.72) / 0.09));
  return {
    captionIndex, opacity, transition: cameraMix,
    pose: { yaw: interpolate("yaw"), pitch: interpolate("pitch"), distance: interpolate("distance"), screenX: interpolate("screenX") },
  };
}
