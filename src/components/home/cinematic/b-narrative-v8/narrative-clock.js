export const STORY_END=551;
export const clampStory=f=>Math.max(0,Math.min(STORY_END,Number.isFinite(+f)?+f:0));
export function narrativeState(input){const frame=clampStory(input);if(frame<=191)return {frame,assetFrame:frame,source:1,chapter:'primary',phase:frame<96?'overview':frame<=137?'reading':'seat'};const index=Math.min(2,Math.floor((frame-191)/120)),u=frame-191-index*120;return {frame,assetFrame:191,source:index+2,u,chapter:'secondary',phase:u<14?'enter':u<38?'reading':u<50?'selection':u<74?'copy':u<110?'approach':'seat'};}
