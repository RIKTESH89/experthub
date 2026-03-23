"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BadgeCheck,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  Users,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { formatDate, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ExpertRow {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  displayName: string;
  specialty: string[];
  isVerified: boolean;
  createdAt: string;
  _count: {
    subscribers: number;
    posts: number;
  };
}

export default function AdminExpertsPage() {
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExperts() {
      try {
        const res = await fetch("/api/admin/experts");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setExperts(data.experts ?? data);
      } catch {
        toast.error("Failed to load experts");
      } finally {
        setIsLoading(false);
      }
    }
    fetchExperts();
  }, []);

  const handleVerifyToggle = useCallback(
    async (expertId: string, currentlyVerified: boolean) => {
      setActionLoading(expertId);
      const action = currentlyVerified ? "unverify" : "verify";
      try {
        const res = await fetch(
          `/api/admin/experts/${expertId}/${action}`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error(`Failed to ${action}`);
        setExperts((prev) =>
          prev.map((e) =>
            e.id === expertId
              ? { ...e, isVerified: !currentlyVerified }
              : e
          )
        );
        toast.success(
          `Expert ${action === "verify" ? "verified" : "unverified"} successfully`
        );
      } catch {
        toast.error(`Failed to ${action} expert`);
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const filteredExperts = useMemo(() => {
    return experts.filter((expert) => {
      const matchesSearch =
        !searchQuery ||
        expert.displayName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        expert.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "verified" && expert.isVerified) ||
        (activeTab === "unverified" && !expert.isVerified);
      return matchesSearch && matchesTab;
    });
  }, [experts, searchQuery, activeTab]);

  const verifiedCount = experts.filter((e) => e.isVerified).length;
  const unverifiedCount = experts.filter((e) => !e.isVerified).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Expert Verification
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and manage expert verification status.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{experts.length}</p>
              <p className="text-xs text-muted-foreground">Total Experts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <BadgeCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifiedCount}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <ShieldOff className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unverifiedCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All ({experts.length})</TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({verifiedCount})
            </TabsTrigger>
            <TabsTrigger value="unverified">
              Pending ({unverifiedCount})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search experts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expert</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Subscribers</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExperts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No experts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExperts.map((expert) => (
                      <TableRow key={expert.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={expert.image ?? undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(expert.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium">
                                  {expert.displayName}
                                </p>
                                {expert.isVerified && (
                                  <BadgeCheck className="h-3.5 w-3.5 fill-primary text-primary-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {expert.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(expert.specialty ?? []).slice(0, 2).map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {s}
                              </Badge>
                            ))}
                            {(expert.specialty ?? []).length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
                                +{(expert.specialty ?? []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatNumber(expert._count.subscribers)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {expert._count.posts}
                        </TableCell>
                        <TableCell>
                          {expert.isVerified ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 text-yellow-600 dark:text-yellow-400"
                            >
                              <XCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(expert.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading === expert.id}
                              >
                                {actionLoading === expert.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVerifyToggle(
                                    expert.id,
                                    expert.isVerified
                                  )
                                }
                              >
                                {expert.isVerified ? (
                                  <>
                                    <ShieldOff className="mr-2 h-3.5 w-3.5" />
                                    Unverify
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                                    Verify
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
