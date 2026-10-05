// Bounded working set; prediction changes priority, not the authored camera track.
export function frameWindow(frames, index, predicted, direction, radius) {
    const sign = direction < 0 ? -1 : 1;
    const indices = [index, predicted];
    for (let distance=1; distance<=radius+1; distance++) indices.push(index+sign*distance,index-sign*distance);
    return [...new Set(indices.map(i=>frames[Math.max(0,Math.min(frames.length-1,i))]))].slice(0,radius*2+1);
}
export function nearestReadyFrame(frames, index, cache, direction, maxDistance = Infinity) {
    let result, distance=Infinity;
    frames.forEach((key,i)=>{if(!cache.has(key))return;const delta=Math.abs(i-index);if(delta>maxDistance)return;
        if(delta<distance || (delta===distance && (direction<0 ? i<result.index : i>result.index))) { result={key,index:i,item:cache.get(key)};distance=delta; }
    });
    return result;
}

// A previous demand is useful only while it can still serve the current chapter
// or one of the bounded adjacent poster anchors. Demand history alone is insufficient.
export function canServeChapter(key, frames, adjacentPosters) {
    return frames.includes(key) || adjacentPosters.includes(key);
}
