/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { KnowledgeStory } from "@/components/studio/knowledge-story";
import { createKnowledgeScene } from "@/components/studio/knowledge-scene";
jest.mock("@/components/studio/knowledge-scene",()=>({createKnowledgeScene:jest.fn()}));
jest.mock("next-themes",()=>({useTheme:()=>({resolvedTheme:"light"})}));
jest.mock("next/link",()=>({__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=>React.createElement("a",props,children)}));
jest.mock("@/components/studio/knowledge-story.module.css",()=>({story:"story",stage:"stage",poster:"poster",ready:"ready"}));
let reduced=false,change:()=>void,intersection:(entries:{isIntersecting:boolean}[])=>void;
const controller={dispose:jest.fn(),active:jest.fn(),resize:jest.fn(),progress:jest.fn()};
beforeEach(()=>{
 reduced=false;jest.clearAllMocks();(createKnowledgeScene as jest.Mock).mockReturnValue(controller);
 Object.defineProperty(window,"matchMedia",{writable:true,value:()=>({get matches(){return reduced;},addEventListener:(_name:string,fn:()=>void)=>{change=fn;},removeEventListener:jest.fn()})});
 global.IntersectionObserver=class {constructor(fn:typeof intersection){intersection=fn;}observe(){}disconnect(){}} as unknown as typeof IntersectionObserver;
 global.ResizeObserver=class {observe(){}disconnect(){}} as unknown as typeof ResizeObserver;
});
afterEach(cleanup);
it("keeps all five chapters, actions and disclosures without loading WebGL for reduced motion",()=>{
 reduced=true;const {container}=render(React.createElement(KnowledgeStory));expect(createKnowledgeScene).not.toHaveBeenCalled();expect(container.querySelector('[data-enhanced]')?.getAttribute('data-enhanced')).toBe('false');expect(screen.getAllByRole('heading')).toHaveLength(5);expect(screen.getByRole('link',{name:'Explore experts'}).getAttribute('href')).toBe('/login');expect(screen.getByText(/Answers can be incomplete/)).toBeTruthy();
});
it("returns to complete static illustrations if WebGL initialization fails",async()=>{
 (createKnowledgeScene as jest.Mock).mockImplementation(()=>{throw new Error('WebGL unavailable');});const {container}=render(React.createElement(KnowledgeStory));await waitFor(()=>expect(createKnowledgeScene).toHaveBeenCalled());expect(container.querySelector('[data-enhanced]')?.getAttribute('data-enhanced')).toBe('false');expect(screen.getAllByRole('heading')).toHaveLength(5);
});
it("pauses offscreen and disposes the scene on unmount",async()=>{
 const {unmount}=render(React.createElement(KnowledgeStory));await waitFor(()=>expect(createKnowledgeScene).toHaveBeenCalled());act(()=>intersection([{isIntersecting:false}]));expect(controller.active).toHaveBeenLastCalledWith(false);unmount();expect(controller.dispose).toHaveBeenCalledTimes(1);
});
it("responds to a runtime reduced-motion change by disposing WebGL",async()=>{
 const {container}=render(React.createElement(KnowledgeStory));await waitFor(()=>expect(container.querySelector('[data-enhanced]')?.getAttribute('data-enhanced')).toBe('true'));reduced=true;await act(async()=>change());expect(controller.dispose).toHaveBeenCalledTimes(1);expect(container.querySelector('[data-enhanced]')?.getAttribute('data-enhanced')).toBe('false');
});
