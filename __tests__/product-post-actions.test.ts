/** @jest-environment jsdom */
import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {PostActions} from '@/components/posts/post-actions';
afterEach(cleanup);
it('names post actions and restores the pressed bookmark state after a failed request',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:false});render(React.createElement(PostActions,{postId:'synthetic',likes:0,comments:2,bookmarks:1,isLiked:false,isBookmarked:true}));
 expect(screen.getByRole('button',{name:'Like post, 0 likes'}).getAttribute('aria-pressed')).toBe('false');expect(screen.getByRole('button',{name:'View comments, 2 comments'})).toBeTruthy();expect(screen.getByRole('button',{name:'Copy post link'})).toBeTruthy();const bookmark=screen.getByRole('button',{name:'Remove bookmark, 1 bookmarks'});fireEvent.click(bookmark);await waitFor(()=>expect(bookmark.getAttribute('aria-pressed')).toBe('true'));expect(screen.getByRole('button',{name:'Remove bookmark, 1 bookmarks'})).toBeTruthy();
});
