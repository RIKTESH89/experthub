/** @jest-environment jsdom */
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostFeed } from "@/components/posts/post-feed";

jest.mock("@/components/posts/post-card", () => ({ PostCard: ({ post }: { post: { id:string } }) => require("react").createElement("article", {}, post.id) }));
jest.mock("@/components/shared/empty-state", () => ({ EmptyState: ({title}:{title:string}) => require("react").createElement("p", {}, title) }));
jest.mock("motion/react", () => ({ motion: { div: ({children,className}:{children:unknown;className:string}) => require("react").createElement("div", {className}, children) } }));

let intersect: IntersectionObserverCallback;
let fetchMock: jest.Mock;
const result = (posts: {id:string}[]) => ({ ok: true, json: async () => ({ posts }) });
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  global.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {} disconnect() {} unobserve() {} takeRecords() { return []; }
    root = null; rootMargin = ""; thresholds = [];
  } as unknown as typeof IntersectionObserver;
});
afterEach(cleanup);

it("distinguishes a failed initial load from empty and retries the same page", async () => {
  fetchMock.mockResolvedValueOnce({ ok:false }).mockResolvedValueOnce(result([]));
  render(createElement(PostFeed));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("No posts yet")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"Retry loading posts"}));
  expect(await screen.findByText("No posts yet")).toBeTruthy();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/posts?page=1&limit=10", "/api/posts?page=1&limit=10"]);
});

it("retains existing posts after append failure and never skips the failed page", async () => {
  fetchMock.mockResolvedValueOnce(result(Array.from({length:10},(_,i)=>({id:`post-${i}`}))))
    .mockResolvedValueOnce({ok:false}).mockResolvedValueOnce(result([{id:"post-10"}]));
  render(createElement(PostFeed));
  await screen.findByText("post-0");
  await waitFor(() => expect(intersect).toBeDefined());
  act(() => intersect([{isIntersecting:true}] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(await screen.findByText("More posts could not be loaded")).toBeTruthy();
  expect(screen.getByText("post-0")).toBeTruthy();
  expect(screen.queryByText("You've seen it all")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"Retry loading posts"}));
  expect(await screen.findByText("post-10")).toBeTruthy();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/posts?page=1&limit=10", "/api/posts?page=2&limit=10", "/api/posts?page=2&limit=10"]);
});

it("deduplicates rapid observer requests and preserves endpoint query parameters", async () => {
  let resolveNext: (response:unknown)=>void = () => {};
  fetchMock.mockResolvedValueOnce(result(Array.from({length:10},(_,i)=>({id:`post-${i}`}))))
    .mockImplementationOnce(() => new Promise(resolve => { resolveNext = resolve; }));
  render(createElement(PostFeed,{endpoint:"/api/bookmarks?sort=recent"}));
  await screen.findByText("post-0");
  act(() => {
    for(let i=0;i<3;i++) intersect([{isIntersecting:true}] as IntersectionObserverEntry[], {} as IntersectionObserver);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe("/api/bookmarks?sort=recent&page=2&limit=10");
  await act(async () => resolveNext(result([])));
});

it("aborts old endpoint requests and ignores their stale response", async () => {
  let resolveOld: (response:unknown)=>void = () => {};
  fetchMock.mockImplementationOnce(() => new Promise(resolve => {resolveOld=resolve;})).mockResolvedValueOnce(result([{id:"new-post"}]));
  const view = render(createElement(PostFeed,{endpoint:"/api/posts?sort=old"}));
  const oldSignal = fetchMock.mock.calls[0][1].signal;
  view.rerender(createElement(PostFeed,{endpoint:"/api/posts?sort=new"}));
  expect(oldSignal.aborted).toBe(true);
  await screen.findByText("new-post");
  await act(async () => resolveOld(result([{id:"stale-post"}])));
  expect(screen.queryByText("stale-post")).toBeNull();
});
