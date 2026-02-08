import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { huminexApi } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, RefreshCw, Search, Eye, Loader2 } from "lucide-react";
import { AdminTableSkeleton } from "@/components/admin/AdminCardSkeleton";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  tenant_type: string;
  status: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  admin_count: number;
  employee_count: number;
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  suspended: "bg-red-500/10 text-red-500 border-red-500/20",
  inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const typeColors: Record<string, string> = {
  individual: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  business: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enterprise: "bg-primary/10 text-primary border-primary/20",
};

const AdminTenantManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [viewUsersDialogOpen, setViewUsersDialogOpen] = useState(false);

  const {
    data: tenants = [],
    isLoading: loading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["internal-admin-tenants"],
    queryFn: async () => {
      const rows = await huminexApi.getInternalEmployers(200);
      return rows.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        tenant_type: item.tenantType,
        status: item.status,
        contact_email: item.contactEmail,
        created_at: item.createdAtUtc,
        updated_at: item.updatedAtUtc,
        admin_count: item.adminCount,
        employee_count: item.employeeCount,
      }));
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: tenantUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["internal-admin-tenant-users", selectedTenant?.id],
    queryFn: async () => {
      if (!selectedTenant?.id) return [];
      const users = await huminexApi.getInternalEmployerUsers(selectedTenant.id, 200);
      return users;
    },
    enabled: !!selectedTenant?.id && viewUsersDialogOpen,
    refetchOnWindowFocus: false,
  });

  const filteredTenants = useMemo(
    () =>
      tenants.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [tenants, searchTerm]
  );

  const stats = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      business: tenants.filter((t) => t.tenant_type === "business").length,
      admins: tenants.reduce((acc, tenant) => acc + (tenant.admin_count ?? 0), 0),
    }),
    [tenants]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Employer Tenant Management
          </h1>
          <p className="text-muted-foreground">Internal read-only view of employer organizations and tenant users</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading || isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading || isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tenants</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{stats.active}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Business Tenants</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">{stats.business}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Employer Admin Seats</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-purple-500">{stats.admins}</p></CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <AdminTableSkeleton rows={8} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Admins</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeColors[tenant.tenant_type] || typeColors.business}>
                        {tenant.tenant_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[tenant.status] || statusColors.active}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.contact_email}</TableCell>
                    <TableCell>{tenant.admin_count ?? 0}</TableCell>
                    <TableCell>{tenant.employee_count ?? 0}</TableCell>
                    <TableCell>{new Date(tenant.updated_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Dialog
                        open={viewUsersDialogOpen && selectedTenant?.id === tenant.id}
                        onOpenChange={(open) => {
                          setViewUsersDialogOpen(open);
                          if (!open) {
                            setSelectedTenant(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setViewUsersDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Users
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              {tenant.name} Users
                            </DialogTitle>
                          </DialogHeader>
                          {usersLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                          ) : tenantUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No tenant users found</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Roles</TableHead>
                                  <TableHead>Created</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tenantUsers.map((user) => (
                                  <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {(user.roles || []).map((role) => (
                                          <Badge key={`${user.id}-${role}`} variant="outline">{role}</Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell>{new Date(user.createdAtUtc).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTenantManagement;
