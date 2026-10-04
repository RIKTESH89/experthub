/** @jest-environment jsdom */
import React from "react";
import { render, act, screen, cleanup } from "@testing-library/react";
import { EvidenceSculpture } from "@/components/studio/evidence-sculpture";
const mockScene={resize:jest.fn(),active:jest.fn(),pointer:jest.fn(),replay:jest.fn(),dispose:jest.fn()};
jest.mock("@/components/studio/evidence-scene",()=>({createEvidenceScene:jest.fn(()=>mockScene)}));
jest.mock("next-themes",()=>({useTheme:()=>({resolvedTheme:"light"})}));
let reduced=false;
const listeners=new Map<string,()=>void>();
beforeEach(()=>{
  jest.clearAllMocks(); reduced=false;listeners.clear();
  window.matchMedia=jest.fn((query:string)=>({matches:query.includes("reduced")?reduced:false,addEventListener:(_event:string,fn:()=>void)=>listeners.set(query,fn),removeEventListener:jest.fn()})) as unknown as typeof window.matchMedia;
  Object.defineProperty(navigator,"hardwareConcurrency",{value:8,configurable:true});
  window.IntersectionObserver=class{observe(){}disconnect(){}} as unknown as typeof IntersectionObserver;
  window.ResizeObserver=class{observe(){}disconnect(){}} as unknown as typeof ResizeObserver;
  jest.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({getExtension:()=>({loseContext:jest.fn()})} as never);
});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
it("loads eligible geometry and disposes it on route unmount",async()=>{
  const view=render(React.createElement(EvidenceSculpture));await act(async()=>{});
  expect(screen.getByRole("button",{name:/Replay knowledge/})).toBeTruthy();
  view.unmount();expect(mockScene.dispose).toHaveBeenCalledTimes(1);
});
it("keeps reduced-motion users on the static sculpture without loading WebGL",async()=>{
  reduced=true;render(React.createElement(EvidenceSculpture));await act(async()=>{});
  expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
  expect(screen.queryByRole("button",{name:/Replay knowledge/})).toBeNull();
});
it("disposes active geometry when reduced motion is requested",async()=>{
  render(React.createElement(EvidenceSculpture));await act(async()=>{});
  // Browser MediaQueryList updates its matches property before firing change.
  const preference=(window.matchMedia as jest.Mock).mock.results[1].value;preference.matches=true;
  await act(async()=>listeners.get("(prefers-reduced-motion: reduce)")?.());
  expect(mockScene.dispose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button",{name:/Replay knowledge/})).toBeNull();
});
