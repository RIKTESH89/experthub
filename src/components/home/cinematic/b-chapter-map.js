// App clock v3: normalized four-contribution preparation. B's author/renderer Story tracks remain unchanged.
const keys={
 introduction:[[0,0],[.16,0],[.88,14],[1,14]],
 contributions:[[0,14],[.12,14],[.72,86],[1,86]],
 context:[[0,86],[.12,86],[.55,137],[1,137]],
 construction:[[0,137],[.04,137],[.14,191],[.42,311],[.70,431],[.98,551],[1,551]],
 conversation:[[0,551],[1,551]],
 control:[[0,551],[1,551]],
 close:[[0,551],[1,551]],
};
export function bChapterFrame(phase,chapter){const points=keys[chapter.id];if(!points)throw Error('Unknown B chapter');const p=Math.max(0,Math.min(1,phase));for(let i=1;i<points.length;i++){const[a,x]=points[i-1],[b,y]=points[i];if(p<=b)return x+(y-x)*(p-a)/(b-a);}return points.at(-1)[1];}
export function portraitWidthPerHeight(frame){const points=[[0,1.03],[53,1.15],[137,.93],[164,.84],[191,.84]];for(let i=1;i<points.length;i++){const[a,x]=points[i-1],[b,y]=points[i];if(frame<=b){const t=Math.max(0,(frame-a)/(b-a));return x+(y-x)*t;}}return .84;}
