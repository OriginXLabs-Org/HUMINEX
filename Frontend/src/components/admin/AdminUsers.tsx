import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { huminexApi } from "@/integrations/api/client";
import { Loader2, RefreshCw, Search, Users } from "lucide-react";

export const AdminUsers = () => {
  const [search, setSearch] = useState("");

  const {
    data: users = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["internal-admin-users", search],
    queryFn: async () => huminexApi.getInternalUsers(500, search || undefined),
    refetchOnWindowFocus: false,
    staleTime: 10000,
  });

  const stats = useMemo(() => {
    const total = users.length;
    const tenantCount = new Set(users.map((user) => user.tenantId)).size;
    const adminCount = users.filter((user) => (user.roles || []).some((role) => ["admin", "super_admin", "director"].includes(role.toLowerCase()))).length;
    return { total, tenantCount, adminCount };
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Employer Admin Directory</h1>
          <p className="text-muted-foreground">Internal cross-tenant user visibility powered by HUMINEX Admin APIs</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tenants</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.tenantCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Admin/Super Admin</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">{stats.adminCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tenant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Roles</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{user.tenantId}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || []).length === 0 ? (
                            <Badge variant="secondary">no-role</Badge>
                          ) : (
                            (user.roles || []).map((role) => (
                              <Badge key={`${user.id}-${role}`} variant="outline">{role}</Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(user.createdAtUtc).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
