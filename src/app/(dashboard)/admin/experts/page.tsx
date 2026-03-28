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
  TrendingUp,
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
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  motion,
} from "@/components/ui/motion";
import { cn } from "@/lib/utils";

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

const statCards = [
  {
    key: "total",
    label: "Total Experts",
    icon: Users,
    iconBg: "bg-[#1E40AF]/10",
    iconColor: "text-[#1E40AF] dark:text-blue-400",
    borderAccent: "border-l-[#1E40AF]",
  },
  {
    key: "verified",
    label: "Verified",
    icon: BadgeCheck,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderAccent: "border-l-emerald-500",
  },
  {
    key: "pending",
    label: "Pending Review",
    icon: ShieldOff,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderAccent: "border-l-amber-500",
  },
] as const;

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

  const statValues = {
    total: experts.length,
    verified: verifiedCount,
    pending: unverifiedCount,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E40AF]/10 ring-1 ring-[#1E40AF]/20">
            <ShieldCheck className="h-4.5 w-4.5 text-[#1E40AF] dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-sans">
              Expert Verification
            </h2>
            <p className="text-sm text-muted-foreground font-sans">
              Review and manage expert verification status.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <StaggerItem key={card.key}>
              <Card className={cn(
                "relative overflow-hidden border-l-4 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5",
                card.borderAccent
              )}>
                <CardContent className="relative flex items-center gap-4 p-5">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    card.iconBg
                  )}>
                    <Icon className={cn("h-6 w-6", card.iconColor)} />
                  </div>
                  <div>
                    <AnimatedCounter
                      value={statValues[card.key]}
                      className="text-3xl font-bold tracking-tight"
                    />
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 font-sans">
                      {card.label}
                    </p>
                  </div>
                  {card.key === "verified" && verifiedCount > 0 && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium">
                        {Math.round((verifiedCount / experts.length) * 100)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Tabs and Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="bg-muted/60 p-1 h-auto">
            {[
              { value: "all", label: "All", count: experts.length },
              { value: "verified", label: "Verified", count: verifiedCount },
              { value: "unverified", label: "Pending", count: unverifiedCount },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-4 py-2 text-sm transition-all duration-200"
              >
                {tab.label}
                <span className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-colors duration-200",
                  activeTab === tab.value
                    ? "bg-[#1E40AF]/10 text-[#1E40AF]"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search experts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-muted-foreground/10 focus:bg-background transition-colors duration-200"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="overflow-hidden border-muted-foreground/10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-muted-foreground/10">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Expert</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Specialties</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Subscribers</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Posts</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Joined</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground font-sans">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExperts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                            <Search className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground font-sans">No experts found</p>
                          <p className="text-xs text-muted-foreground/70 font-sans">Try adjusting your search or filter</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExperts.map((expert, index) => (
                      <motion.tr
                        key={expert.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="group border-b border-muted-foreground/5 transition-colors duration-200 hover:bg-muted/40"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                <AvatarImage
                                  src={expert.image ?? undefined}
                                />
                                <AvatarFallback className="text-xs bg-[#1E40AF]/10 text-[#1E40AF] dark:text-blue-300 font-semibold">
                                  {getInitials(expert.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              {expert.isVerified && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background shadow-sm"
                                >
                                  <BadgeCheck className="h-3.5 w-3.5 fill-emerald-500 text-white" />
                                </motion.div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold group-hover:text-[#1E40AF] transition-colors duration-200 font-sans">
                                {expert.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground font-sans">
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
                                className="text-[10px] font-medium bg-[#1E40AF]/5 text-[#1E40AF]/80 border border-[#1E40AF]/10 hover:bg-[#1E40AF]/10 transition-colors duration-200"
                              >
                                {s}
                              </Badge>
                            ))}
                            {(expert.specialty ?? []).length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium"
                              >
                                +{(expert.specialty ?? []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums font-sans">
                            {formatNumber(expert._count.subscribers)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums font-sans">
                            {expert._count.posts}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expert.isVerified ? (
                            <Badge
                              variant="secondary"
                              className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shadow-sm"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 font-medium"
                            >
                              <XCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-sans">
                          {formatDate(expert.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 data-[state=open]:opacity-100"
                                disabled={actionLoading === expert.id}
                              >
                                {actionLoading === expert.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVerifyToggle(
                                    expert.id,
                                    expert.isVerified
                                  )
                                }
                                className="cursor-pointer gap-2"
                              >
                                {expert.isVerified ? (
                                  <>
                                    <ShieldOff className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Unverify</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Verify</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
