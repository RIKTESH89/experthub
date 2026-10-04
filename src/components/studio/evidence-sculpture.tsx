"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { RotateCcw } from "lucide-react";
import { canEnhanceHero } from "./hero-motion-policy";
import type { createEvidenceScene } from "./evidence-scene";

export function EvidenceSculpture() {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const controller=useRef<ReturnType<typeof createEvidenceScene>>();
  const [ready,setReady]=useState(false);
  const {resolvedTheme}=useTheme();
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    let cancelled=false,visible=true,generation=0;setReady(false);
    const phone=matchMedia("(max-width: 600px)");
    const preference=matchMedia("(prefers-reduced-motion: reduce)");
    const nav=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
    const reset=()=>{controller.current?.dispose();controller.current=undefined;setReady(false);};
    const activate=()=>controller.current?.active(visible&&!document.hidden);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;activate();});observer.observe(canvas);
    const resize=new ResizeObserver(()=>controller.current?.resize());resize.observe(canvas);
    const lose=(event:Event)=>{event.preventDefault();reset();};canvas.addEventListener("webglcontextlost",lose);
    const load=async()=>{
      const current=++generation;reset();if(preference.matches||nav.connection?.saveData)return;
      const probe=document.createElement("canvas"); const context=probe.getContext("webgl2");
      const eligible=canEnhanceHero({reducedMotion:preference.matches,saveData:!!nav.connection?.saveData,hardwareConcurrency:nav.hardwareConcurrency,deviceMemory:nav.deviceMemory,webgl2:!!context});
      context?.getExtension("WEBGL_lose_context")?.loseContext();if(!eligible)return;
      try{const {createEvidenceScene}=await import("./evidence-scene");if(cancelled||current!==generation||preference.matches)return;
        controller.current=createEvidenceScene(canvas,resolvedTheme==="dark",phone.matches);setReady(true);activate();
      }catch{reset();}
    };
    const move=(event:PointerEvent)=>{if(event.pointerType!=="mouse")return;const box=canvas.getBoundingClientRect();controller.current?.pointer((event.clientX-box.left)/box.width*2-1,(event.clientY-box.top)/box.height*2-1);};
    canvas.addEventListener("pointermove",move);document.addEventListener("visibilitychange",activate);preference.addEventListener("change",load);phone.addEventListener("change",load);void load();
    return()=>{cancelled=true;observer.disconnect();resize.disconnect();canvas.removeEventListener("pointermove",move);canvas.removeEventListener("webglcontextlost",lose);document.removeEventListener("visibilitychange",activate);preference.removeEventListener("change",load);phone.removeEventListener("change",load);reset();};
  },[resolvedTheme]);
  return <div className="studio-sculpture" data-enhanced={ready}>
    <div className="studio-sculpture-poster" aria-hidden="true"><div className="studio-paper-fan">{[0,1,2,3,4].map(i=><div className="studio-paper" key={i} style={{"--sheet":i} as React.CSSProperties}><span/><span/><span/><span/><span/></div>)}</div><div className="studio-ceramic"><span>e.</span></div></div>
    <canvas ref={canvasRef} aria-hidden="true" className={ready?"is-ready":""}/>
    <span className="studio-sculpture-caption">An illustration of knowledge taking shape</span>
    {ready&&<button type="button" className="studio-sculpture-replay" aria-label="Replay knowledge sculpture animation" onClick={()=>controller.current?.replay()}><RotateCcw size={14}/>Replay</button>}
  </div>;
}
