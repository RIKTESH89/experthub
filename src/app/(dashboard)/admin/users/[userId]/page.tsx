"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  User,
  Ban,
  CheckCircle,
  Loader2,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "SUBSCRIBER" | "EXPERT" | "ADMIN";
  status: "active" | "banned";
  createdAt: string;
  bio?: string | null;
  headline?: string | null;
  _count: {
    posts: number;
    subscriptions: number;
  };
  recentPosts: Array<{
    id: string;
    title?: string | null;
    content: string;
    status: string;
    createdAt: string;
  }>;
}

const roleConfig = {
  SUBSCRIBER: {
    label: "Subscriber",
    icon: User,
    className: "bg-secondary text-secondary-foreground",
  },
  EXPERT: {
    label: "Expert",
    icon: Shield,
    className: "bg-[#1E40AF]/10 text-[#1E40AF] dark:text-blue-400",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-[#1E40AF]/10 text-[#1E40AF] dark:text-blue-300",
  },
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
        setSelectedRole(data.role);
      } catch {
        toast.error("Failed to load user details");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const handleRoleChange = async (newRole: string) => {
    if (!user || newRole === user.role) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setUser((prev) => (prev ? { ...prev, role: newRole as UserDetail["role"] } : null));
      setSelectedRole(newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error("Failed to update role");
      setSelectedRole(user.role);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;
    setIsUpdating(true);
    const action = user.status === "active" ? "ban" : "unban";
    const newBanned = action === "ban";
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: newBanned }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} user`);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              status: action === "ban" ? "banned" : "active",
            }
          : null
      );
      toast.success(
        action === "ban" ? "User has been banned" : "User has been unbanned"
      );
    } catch {
      toast.error(`Failed to ${action} user`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 font-sans">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile card skeleton */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border/40 bg-card p-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="mt-4 h-6 w-32" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Separator className="my-5 w-full" />
                <div className="w-full space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-border/40 bg-card p-6">
              <Skeleton className="h-5 w-36 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <Skeleton className="h-10 w-[220px] rounded-lg" />
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-6">
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <FadeIn className="flex flex-col items-center justify-center py-20 font-sans">
        <div className="rounded-full bg-muted p-5">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground font-sans">User Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center font-sans">
          The user you are looking for does not exist or may have been removed.
        </p>
        <Button className="mt-6 cursor-pointer" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </FadeIn>
    );
  }

  const role = roleConfig[user.role];

  return (
    <PageTransition className="space-y-8 font-sans">
      {/* Header */}
      <FadeIn delay={0.05}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer rounded-lg border border-border bg-card shadow-sm hover:bg-secondary transition-colors duration-200"
            asChild
          >
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              User Details
            </h2>
            <p className="text-sm text-muted-foreground font-sans">
              Viewing profile for{" "}
              <span className="font-medium text-foreground">{user.name}</span>
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="cursor-pointer rounded-lg shadow-sm"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBanToggle} className="cursor-pointer">
                {user.status === "active" ? (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Unban User
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Profile Card */}
        <FadeIn delay={0.1} className="lg:col-span-1">
          <Card className="relative overflow-hidden border-border">
            {/* Top accent bar */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-[#1E40AF]/50" />

            <CardContent className="relative flex flex-col items-center pt-8 pb-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="relative h-24 w-24 ring-2 ring-background shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-2xl font-semibold bg-muted">
                    {(user.name || "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {/* Status indicator on avatar */}
                <div
                  className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-2 ring-background ${
                    user.status === "active" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>

              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground font-sans">{user.name}</h3>

              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className={`${role.className} shadow-sm`}>
                  <role.icon className="mr-1 h-3 w-3" />
                  {role.label}
                </Badge>
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    user.status === "active"
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      user.status === "active" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {user.status}
                </div>
              </div>

              {user.headline && (
                <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed font-sans">
                  {user.headline}
                </p>
              )}

              <Separator className="my-5 w-full" />

              <div className="w-full space-y-3.5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="truncate text-muted-foreground text-[13px] font-sans">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground text-[13px] font-sans">
                    Joined {formatDate(user.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground text-[13px] font-sans">
                    {user._count.posts} post{user._count.posts !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {user.bio && (
                <>
                  <Separator className="my-5 w-full" />
                  <p className="w-full text-sm leading-relaxed text-muted-foreground font-sans">
                    {user.bio}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Role Management */}
          <FadeIn delay={0.2}>
            <Card className="relative overflow-hidden border-border">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[#1E40AF]/40" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E40AF]/10">
                    <Shield className="h-4 w-4 text-[#1E40AF] dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground font-sans">Role Management</CardTitle>
                    <CardDescription className="text-muted-foreground font-sans">
                      Change this user&apos;s role to adjust their permissions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-[220px] shadow-sm cursor-pointer">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBSCRIBER" className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Subscriber
                        </span>
                      </SelectItem>
                      <SelectItem value="EXPERT" className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-[#1E40AF]" />
                          Expert
                        </span>
                      </SelectItem>
                      <SelectItem value="ADMIN" className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#1E40AF]" />
                          Admin
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Recent Posts */}
          <FadeIn delay={0.3}>
            <Card className="relative overflow-hidden border-border">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[#1E40AF]/40" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E40AF]/10">
                    <FileText className="h-4 w-4 text-[#1E40AF]" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground font-sans">Recent Posts</CardTitle>
                    <CardDescription className="text-muted-foreground font-sans">
                      Latest posts by this user
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {user.recentPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="rounded-full bg-muted p-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground font-sans">
                      No posts yet
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="space-y-3">
                    {user.recentPosts.map((post) => (
                      <StaggerItem key={post.id}>
                        <div className="group flex items-start justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:bg-secondary hover:border-border hover:shadow-sm">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug group-hover:text-foreground transition-colors duration-200 font-sans">
                              {post.title || (post.content || "").slice(0, 60) + "..."}
                            </p>
                            <div className="mt-2 flex items-center gap-2.5">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium ${
                                  post.status === "PUBLISHED"
                                    ? "border-green-200 bg-green-50/50 text-green-600 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400"
                                    : "border-yellow-200 bg-yellow-50/50 text-yellow-600 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400"
                                }`}
                              >
                                {post.status.toLowerCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-sans">
                                {formatDate(post.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
