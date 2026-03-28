"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Eye,
  Ban,
  Trash2,
  Search,
  Loader2,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  User,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn, getInitials, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FadeIn, motion } from "@/components/ui/motion";

interface UserRow {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "USER" | "EXPERT" | "ADMIN";
  status: "active" | "banned";
  createdAt: string;
}

const roleConfig = {
  USER: {
    label: "User",
    icon: User,
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  EXPERT: {
    label: "Expert",
    icon: Shield,
    className: "bg-[#1E40AF]/10 text-[#1E40AF] dark:text-blue-400 border-[#1E40AF]/20",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-[#1E40AF]/10 text-[#1E40AF] dark:text-blue-300 border-[#1E40AF]/20",
  },
};

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <FadeIn direction="up" duration={0.3}>
      <div className="space-y-5 font-sans">
        {/* Search and filter skeleton */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <ShimmerBlock className="h-11 w-full rounded-xl" />
          </div>
          <ShimmerBlock className="h-11 w-[160px] rounded-xl" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="border-b border-slate-200 bg-[#F8FAFC] px-6 py-3.5">
            <div className="flex items-center gap-4">
              <ShimmerBlock className="h-3.5 w-20" />
              <ShimmerBlock className="h-3.5 w-14 ml-auto" />
              <ShimmerBlock className="h-3.5 w-16" />
              <ShimmerBlock className="h-3.5 w-20" />
              <ShimmerBlock className="h-3.5 w-16" />
            </div>
          </div>
          {/* Rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/30 last:border-0 px-6 py-4"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Avatar */}
              <ShimmerBlock className="h-10 w-10 shrink-0 rounded-full" />
              {/* Name and email */}
              <div className="flex-1 space-y-2">
                <ShimmerBlock className="h-4 w-36" />
                <ShimmerBlock className="h-3 w-48" />
              </div>
              {/* Role */}
              <ShimmerBlock className="h-6 w-20 rounded-full" />
              {/* Status */}
              <ShimmerBlock className="h-6 w-18 rounded-full" />
              {/* Date */}
              <ShimmerBlock className="h-4 w-24" />
              {/* Action */}
              <ShimmerBlock className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

export function UserTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setUsers(data.users ?? data);
      } catch {
        toast.error("Failed to load users");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleBanToggle = useCallback(async (userId: string, currentStatus: string) => {
    setActionLoading(userId);
    try {
      const action = currentStatus === "active" ? "ban" : "unban";
      const isBanned = currentStatus === "active";
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} user`);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: currentStatus === "active" ? "banned" as const : "active" as const }
            : u
        )
      );
      toast.success(`User ${action === "ban" ? "banned" : "unbanned"} successfully`);
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = useCallback(async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted successfully");
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  }, []);

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <FadeIn direction="up" duration={0.3}>
      <div className="space-y-5 font-sans">
        {/* Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-11 rounded-xl border-slate-200",
                "bg-white",
                "placeholder:text-slate-400",
                "focus-visible:ring-[#1E40AF]/20 focus-visible:border-[#1E40AF]/30",
                "transition-all duration-200"
              )}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger
              className={cn(
                "w-full sm:w-[160px] h-11 rounded-xl border-slate-200 cursor-pointer",
                "bg-white",
                "focus:ring-[#1E40AF]/20 focus:border-[#1E40AF]/30",
                "transition-all duration-200"
              )}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Filter by role" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <SelectItem value="all" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  All Roles
                </span>
              </SelectItem>
              <SelectItem value="USER" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Users
                </span>
              </SelectItem>
              <SelectItem value="EXPERT" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Experts
                </span>
              </SelectItem>
              <SelectItem value="ADMIN" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admins
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div
          className={cn(
            "overflow-x-auto rounded-xl border border-slate-200",
            "bg-white",
            "shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                  User
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                  Role
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                  Joined
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 font-sans">
                          No users found
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-sans">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const role = roleConfig[user.role];
                  const RoleIcon = role.icon;

                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(index * 0.03, 0.3),
                        ease: [0.25, 0.4, 0.25, 1],
                      }}
                      className={cn(
                        "group border-b border-border/30 last:border-0",
                        "transition-colors duration-200",
                        "hover:bg-muted/40 dark:hover:bg-muted/20",
                        actionLoading === user.id && "opacity-60"
                      )}
                    >
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative">
                            <Avatar className="h-10 w-10 ring-2 ring-border/50 group-hover:ring-[#1E40AF]/20 transition-all duration-200">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold",
                                  "bg-[#1E40AF]/10",
                                  "text-[#1E40AF]/80"
                                )}
                              >
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Status indicator dot */}
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                                user.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-red-400"
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-[#1E40AF]/90 transition-colors duration-200 font-sans">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate font-sans">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-1.5 text-[10px] font-semibold border px-2.5 py-1",
                            "transition-all duration-200",
                            "group-hover:shadow-sm",
                            role.className
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 font-sans">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 font-sans">
                              <XCircle className="h-3.5 w-3.5" />
                              Banned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 tabular-nums font-sans">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-lg cursor-pointer",
                                "opacity-60 group-hover:opacity-100",
                                "hover:bg-muted/80",
                                "transition-all duration-200"
                              )}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#1E40AF]" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={cn(
                              "w-48 rounded-xl border-slate-200",
                              "bg-white",
                              "shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
                              "p-1.5"
                            )}
                          >
                            <DropdownMenuItem className="rounded-lg gap-2.5 py-2.5 px-3 cursor-pointer text-sm focus:bg-slate-50">
                              <Eye className="h-4 w-4 text-slate-500" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1.5 bg-slate-200" />
                            <DropdownMenuItem
                              onClick={() =>
                                handleBanToggle(user.id, user.status)
                              }
                              className="rounded-lg gap-2.5 py-2.5 px-3 cursor-pointer text-sm focus:bg-slate-50"
                            >
                              <Ban className="h-4 w-4 text-amber-500" />
                              <span>
                                {user.status === "active"
                                  ? "Ban User"
                                  : "Unban User"}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-lg gap-2.5 py-2.5 px-3 cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete User</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-sans">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredUsers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {users.length}
            </span>{" "}
            users
          </p>
        </div>
      </div>
    </FadeIn>
  );
}
