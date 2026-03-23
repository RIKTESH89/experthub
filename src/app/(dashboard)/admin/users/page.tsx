import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all registered users, their roles, and account status.
        </p>
      </div>

      <UserTable />
    </div>
  );
}
