/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";
jest.mock("@/components/ui/motion",()=>({StaggerContainer:({children}:{children:React.ReactNode})=>children,StaggerItem:({children}:{children:React.ReactNode})=>children}));
jest.mock("@/components/dashboard/stat-card",()=>({StatCard:({title,value}:{title:string;value:string})=>React.createElement('p',null,title+': '+value)}));
afterEach(cleanup);
it('shows failed statistics as unavailable and replaces them with real DTO values after retry',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>({totalUsers:5,activeExperts:1,activeSubscriptions:1,totalPosts:1,trends:{users:{},experts:{},subscriptions:{},posts:{}}})});
 render(React.createElement(AdminStatCards));await screen.findByRole('alert');expect(screen.queryByText('Total Users: 0')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry statistics'}));await screen.findByText('Total Users: 5');expect(screen.queryByRole('alert')).toBeNull();
});
