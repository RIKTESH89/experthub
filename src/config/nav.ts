export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { title: "Users", href: "/admin/users", icon: "Users" },
  { title: "Content", href: "/admin/content", icon: "FileText" },
  { title: "Reports", href: "/admin/reports", icon: "Flag" },
  { title: "Experts", href: "/admin/experts", icon: "GraduationCap" },
  { title: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
  { title: "Settings", href: "/admin/settings", icon: "Settings" },
];

export const expertNav: NavItem[] = [
  { title: "Dashboard", href: "/expert", icon: "LayoutDashboard" },
  { title: "Posts", href: "/expert/posts", icon: "FileText" },
  { title: "Knowledge Base", href: "/expert/knowledge", icon: "BookOpen" },
  { title: "Digital Twin", href: "/expert/twin", icon: "Bot" },
  { title: "Subscribers", href: "/expert/subscribers", icon: "Users" },
  { title: "Analytics", href: "/expert/analytics", icon: "BarChart3" },
  { title: "Pricing", href: "/expert/pricing", icon: "DollarSign" },
  { title: "Embed Widget", href: "/expert/widget", icon: "Code" },
  { title: "Profile", href: "/expert/profile", icon: "User" },
  { title: "Settings", href: "/expert/settings", icon: "Settings" },
];

export const subscriberNav: NavItem[] = [
  { title: "Feed", href: "/subscriber/feed", icon: "Newspaper" },
  { title: "Dashboard", href: "/subscriber", icon: "LayoutDashboard" },
  { title: "Hub", href: "/subscriber/hub", icon: "Compass" },
  { title: "Subscriptions", href: "/subscriber/subscriptions", icon: "CreditCard" },
  { title: "Bookmarks", href: "/subscriber/bookmarks", icon: "Bookmark" },
  { title: "Profile", href: "/subscriber/profile", icon: "User" },
  { title: "Settings", href: "/subscriber/settings", icon: "Settings" },
];

export const navByRole: Record<string, NavItem[]> = {
  ADMIN: adminNav,
  EXPERT: expertNav,
  SUBSCRIBER: subscriberNav,
};
