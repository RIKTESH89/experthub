import { userRowStatus } from "@/components/admin/user-row-state";
it.each([
 [{isActive:true,isBanned:false},'active'],[{isActive:false,isBanned:false},'inactive'],
 [{isActive:true,isBanned:true},'banned'],[{isActive:false,isBanned:true},'banned'],[{},'unknown'],
])('uses API flags to distinguish account state: %j', (flags, expected)=>expect(userRowStatus(flags)).toBe(expected));
