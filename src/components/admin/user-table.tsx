"use client";
import { userRowStatus } from "./user-row-state";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  role: "SUBSCRIBER" | "USER" | "EXPERT" | "ADMIN";
  status: "active" | "banned" | "inactive" | "unknown";
  isActive?: boolean;
  isBanned?: boolean;
  createdAt: string;
}

const roleConfig: Record<string, { label: string; icon: typeof User; className: string }> = {
  SUBSCRIBER: {
    label: "Subscriber",
    icon: User,
    className: "bg-secondary/50 text-muted-foreground dark:text-muted-foreground border-border/20",
  },
  USER: {
    label: "User",
    icon: User,
    className: "bg-secondary/50 text-muted-foreground dark:text-muted-foreground border-border/20",
  },
  EXPERT: {
    label: "Expert",
    icon: Shield,
    className: "bg-primary/10 text-primary dark:text-primary border-primary/20",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-primary/10 text-primary dark:text-primary border-primary/20",
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
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Header */}
          <div className="border-b border-border bg-secondary px-6 py-3.5">
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
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchUsers() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/admin/users", { signal: controller.signal });
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Your session cannot access user administration. Sign in with an admin account and try again." : "Users could not be loaded. Try again.");
        const data = await res.json();
        const rows = data.users ?? data;
        if (!Array.isArray(rows)) throw new Error("Invalid users response");
        if (!controller.signal.aborted) setUsers(rows.map((user: UserRow) => ({ ...user, name: user.name || user.email, status: userRowStatus(user) })));
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Users could not be loaded. Try again.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    fetchUsers();
    return () => controller.abort();
  }, [loadAttempt]);

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

  const handleBanToggle = useCallback(async (userId: string, currentlyBanned: boolean) => {
    setActionLoading(userId);
    try {
      const action = currentlyBanned ? "unban" : "ban";
      const isBanned = !currentlyBanned;
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} user`);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isBanned, status: userRowStatus({ ...u, isBanned }) }
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
    return <div role="status" aria-label="Loading users"><TableSkeleton /></div>;
  }

  if (loadError) return <section role="alert" className="space-y-3 rounded-xl border bg-card p-6"><h2 className="text-lg font-medium">User list unavailable</h2><p>{loadError}</p><Button variant="outline" onClick={() => setLoadAttempt(value => value + 1)}>Retry users</Button></section>;

  return (
    <FadeIn direction="up" duration={0.3}>
      <div className="space-y-5 font-sans">
        {/* Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200" />
            <Input
              aria-label="Search users by name or email"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-11 rounded-xl border-border",
                "bg-card",
                "placeholder:text-muted-foreground",
                "focus-visible:ring-primary/20 focus-visible:border-primary/30",
                "transition-all duration-200"
              )}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger aria-label="Filter users by role"
              className={cn(
                "w-full sm:w-[160px] h-11 rounded-xl border-border cursor-pointer",
                "bg-card",
                "focus:ring-primary/20 focus:border-primary/30",
                "transition-all duration-200"
              )}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter by role" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <SelectItem value="all" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  All Roles
                </span>
              </SelectItem>
              <SelectItem value="SUBSCRIBER" className="cursor-pointer rounded-lg">
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Subscribers
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
            "overflow-x-auto rounded-xl border border-border",
            "bg-card",
            "shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-secondary hover:bg-secondary">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                  User
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                  Role
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                  Joined
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground font-sans">
                          No users found
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-sans">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const role = roleConfig[user.role] ?? roleConfig.SUBSCRIBER;
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
                            <Avatar className="h-10 w-10 ring-2 ring-border/50 group-hover:ring-primary/20 transition-all duration-200">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold",
                                  "bg-primary/10",
                                  "text-primary/80"
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
                            <p className="text-sm font-semibold truncate group-hover:text-primary/90 transition-colors duration-200 font-sans">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate font-sans">
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
                              {user.status === "banned" ? "Banned" : user.status === "inactive" ? "Inactive" : "Status unavailable"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground tabular-nums font-sans">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label={`Actions for ${user.name || user.email}`}
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
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={cn(
                              "w-48 rounded-xl border-border",
                              "bg-card",
                              "shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
                              "p-1.5"
                            )}
                          >
                            <DropdownMenuItem
                              className="rounded-lg gap-2.5 py-2.5 px-3 cursor-pointer text-sm focus:bg-secondary"
                              onClick={() => router.push(`/admin/users/${user.id}`)}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1.5 bg-muted" />
                            <DropdownMenuItem
                              disabled={typeof user.isBanned !== "boolean"}
                              onClick={() =>
                                handleBanToggle(user.id, !!user.isBanned)
                              }
                              className="rounded-lg gap-2.5 py-2.5 px-3 cursor-pointer text-sm focus:bg-secondary"
                            >
                              <Ban className="h-4 w-4 text-amber-500" />
                              <span>
                                {user.isBanned ? "Unban User" : "Ban User"}
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
          <p className="text-xs text-muted-foreground font-sans">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredUsers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {users.length}
            </span>{" "}
            users
          </p>
        </div>
      </div>
    </FadeIn>
  );
}
