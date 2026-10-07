// JosephASG / Joseph Santaamaria, Cinematic3DScroll variant 2 (MIT).
// Pinned source: 7a56d1fdc12058e3a955348a7a9f3387a2bf57da.
// Only title/subtitle content changed; camera/target/positions/intervals preserved.
// Official GSAP 3.13.0 engine; full seven headings remain in the static story.
export interface ScenePerspective {
  title: string;
  subtitle: string;
  position:
    | 'top'
    | 'top-left'
    | 'left'
    | 'right'
    | 'center'
    | 'top-right'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right';
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number }; // in radians
  scrollProgress: { start: number; end: number }; // percentage 0-100
  hideText?: boolean; // Added flag to hide text for transition sections
}

export const scenePerspectives: ScenePerspective[] = [
  {
    title: 'EXPERT AI TWINS',
    subtitle: 'Explore their thinking. Talk to their AI twin.',
    position: 'center',
    camera: { x: 0, y: 2, z: 10 },
    target: { x: 0, y: 5, z: 0 },
    scrollProgress: { start: 0, end: 11.9 },
  },
  {
    title: 'FIND YOUR EXPERT',
    subtitle: 'Find experts on topics you care about.',
    position: 'left',
    camera: { x: 3, y: 8, z: 10 },
    target: { x: 0, y: 10, z: 0 },
    scrollProgress: { start: 11.9, end: 23.7 },
  },
  {
    title: 'READ THEIR WORK',
    subtitle: 'Explore the posts and ideas they share.',
    position: 'right',
    camera: { x: -10, y: 15, z: 0 },
    target: { x: 0, y: 15, z: 0 },
    scrollProgress: { start: 23.7, end: 35.6 },
  },
  {
    title: 'MEET THEIR AI',
    subtitle: 'AI shaped by the expert’s shared knowledge.',
    position: 'top-left',
    camera: { x: -10, y: 22, z: 0 },
    target: { x: 0, y: 25, z: 0 },
    scrollProgress: { start: 35.6, end: 45.8 },
  },
  {
    title: '',
    subtitle: '',
    position: 'top-right',
    camera: { x: 5, y: 35, z: 5 },
    target: { x: 0, y: 20, z: 0 },
    scrollProgress: { start: 45.8, end: 52.5 },
    hideText: true,
  },
  {
    title: 'ASK AWAY',
    subtitle: 'Bring a question. Talk it through with AI.',
    position: 'center',
    camera: { x: 5, y: 30, z: 10 },
    target: { x: 0, y: 20, z: 0 },
    scrollProgress: { start: 52.5, end: 62.7 },
  },
  {
    title: 'GO DEEPER',
    subtitle: 'Ask a follow-up. Explore another angle.',
    position: 'bottom-right',
    camera: { x: 5, y: 25, z: 10 },
    target: { x: 0, y: 20, z: 0 },
    scrollProgress: { start: 62.7, end: 69.5 },
  },
  {
    title: 'NEW IDEAS',
    subtitle: 'Explore an idea from another point of view.',
    position: 'bottom-left',
    camera: { x: 15, y: 20, z: 5 },
    target: { x: 0, y: 24, z: 0 },
    scrollProgress: { start: 69.5, end: 77.9 },
  },
  {
    title: 'CHOOSE A PLAN',
    subtitle: 'Review their plan for available access.',
    position: 'top',
    camera: { x: 25, y: 15, z: 0 },
    target: { x: 0, y: 20, z: 0 },
    scrollProgress: { start: 77.9, end: 84.7 },
  },
  {
    title: 'START TALKING',
    subtitle: 'Choose an expert. Start with a question.',
    position: 'center',
    camera: { x: 20, y: 20, z: -10 },
    target: { x: 0, y: 20, z: 0 },
    scrollProgress: { start: 84.7, end: 100 },
  },
];
