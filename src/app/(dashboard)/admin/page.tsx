import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";
import { AnalyticsOverview } from "@/components/admin/analytics-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const recentActivity = [
  {
    id: "1",
    user: "Sarah Chen",
    action: "registered as an expert",
    time: "2 minutes ago",
    type: "user" as const,
  },
  {
    id: "2",
    user: "Mike Johnson",
    action: "published a new post",
    time: "15 minutes ago",
    type: "content" as const,
  },
  {
    id: "3",
    user: "Emily Davis",
    action: "subscribed to Dr. Alex Rivera",
    time: "32 minutes ago",
    type: "subscription" as const,
  },
  {
    id: "4",
    user: "James Wilson",
    action: "reported a post for spam",
    time: "1 hour ago",
    type: "report" as const,
  },
  {
    id: "5",
    user: "Lisa Park",
    action: "updated their knowledge base",
    time: "2 hours ago",
    type: "content" as const,
  },
  {
    id: "6",
    user: "Tom Harris",
    action: "cancelled subscription",
    time: "3 hours ago",
    type: "subscription" as const,
  },
];

const activityBadgeColors = {
  user: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  content: "bg-green-500/10 text-green-600 dark:text-green-400",
  subscription: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  report: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <WelcomeBanner userName={session.user.name ?? "Admin"} role="ADMIN" />

      {/* Stat Cards */}
      <AdminStatCards />

      {/* Analytics Charts */}
      <AnalyticsOverview />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {activity.user
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{" "}
                    <span className="text-muted-foreground">
                      {activity.action}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={activityBadgeColors[activity.type]}
                >
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
