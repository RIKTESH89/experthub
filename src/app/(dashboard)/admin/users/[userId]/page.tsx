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
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">User Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The user you are looking for does not exist.
        </p>
        <Button className="mt-4" onClick={() => router.push("/admin/users")}>
          Back to Users
        </Button>
      </div>
    );
  }

  const role = roleConfig[user.role];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">User Details</h2>
          <p className="text-sm text-muted-foreground">
            Viewing profile for {user.name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBanToggle}>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {(user.name || "")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <h3 className="mt-4 text-lg font-semibold">{user.name}</h3>

            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className={role.className}>
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
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {user.headline}
              </p>
            )}

            <Separator className="my-4 w-full" />

            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {formatDate(user.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {user._count.posts} posts
                </span>
              </div>
            </div>

            {user.bio && (
              <>
                <Separator className="my-4 w-full" />
                <p className="w-full text-sm leading-relaxed text-muted-foreground">
                  {user.bio}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Role */}
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Change this user&apos;s role to adjust their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBSCRIBER">Subscriber</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>
                Latest posts by this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.recentPosts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No posts yet
                </p>
              ) : (
                <div className="space-y-3">
                  {user.recentPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {post.title || (post.content || "").slice(0, 60) + "..."}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              post.status === "PUBLISHED"
                                ? "border-green-200 text-green-600"
                                : "border-yellow-200 text-yellow-600"
                            }
                          >
                            {post.status.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
