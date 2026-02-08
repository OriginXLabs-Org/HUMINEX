import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import {
  ApiClientError,
  huminexApi,
  type AccessReviewUserResponse,
  type IdentityAccessMetricsResponse,
  type RoleResponse,
} from "@/integrations/api/client";

const EMPTY_METRICS: IdentityAccessMetricsResponse = {
  totalUsers: 0,
  activeUsersLast24Hours: 0,
  totalRoles: 0,
  totalPolicies: 0,
  usersWithoutRoles: 0,
};

type PolicyEditor = {
  policyId: string;
  name: string;
  permissionsText: string;
};

const TenantIdentityAccess: React.FC = () => {
  const [activeTab, setActiveTab] = useState("roles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [metrics, setMetrics] = useState<IdentityAccessMetricsResponse>(EMPTY_METRICS);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [accessReview, setAccessReview] = useState<AccessReviewUserResponse[]>([]);
  const [policyEditors, setPolicyEditors] = useState<PolicyEditor[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) =>
      role.name.toLowerCase().includes(q) || role.description.toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  const loadIdentityData = async () => {
    setLoading(true);
    try {
      const [metricsResult, rolesResult, reviewResult, policiesResult] = await Promise.all([
        huminexApi.getIdentityAccessMetrics(),
        huminexApi.getRoles(),
        huminexApi.getAccessReview(200),
        huminexApi.getPolicies(),
      ]);

      setMetrics(metricsResult);
      setRoles(rolesResult);
      setAccessReview(reviewResult);
      setPolicyEditors(
        policiesResult.map((policy) => ({
          policyId: policy.policyId,
          name: policy.name,
          permissionsText: policy.permissions.join("\n"),
        }))
      );
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to load Identity & Access data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentityData();
  }, []);

  const handleCreateRole = async () => {
    const name = newRoleName.trim();
    if (!name) {
      toast.error("Role name is required");
      return;
    }

    setSaving(true);
    try {
      await huminexApi.createRole(name, newRoleDescription.trim());
      setNewRoleName("");
      setNewRoleDescription("");
      toast.success("Role created");
      await loadIdentityData();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to create role";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setSaving(true);
    try {
      await huminexApi.deleteRole(roleId);
      toast.success("Role deleted");
      await loadIdentityData();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to delete role";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async (policyId: string, permissionsText: string) => {
    const permissions = permissionsText
      .split("\n")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);

    setSaving(true);
    try {
      await huminexApi.updatePolicy(policyId, permissions);
      toast.success(`Updated policy ${policyId}`);
      await loadIdentityData();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Failed to update policy";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A]">Identity & Access</h1>
          <p className="text-sm text-[#6B7280] mt-1">Real-time role, policy, and access review controls</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadIdentityData} disabled={loading || saving}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Users</p><p className="text-2xl font-semibold">{metrics.totalUsers}</p></div><Users className="w-5 h-5 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Active (24h)</p><p className="text-2xl font-semibold">{metrics.activeUsersLast24Hours}</p></div><UserCheck className="w-5 h-5 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Roles</p><p className="text-2xl font-semibold">{metrics.totalRoles}</p></div><Shield className="w-5 h-5 text-indigo-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Policies</p><p className="text-2xl font-semibold">{metrics.totalPolicies}</p></div><Save className="w-5 h-5 text-purple-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Users Without Roles</p><p className="text-2xl font-semibold">{metrics.usersWithoutRoles}</p></div><AlertTriangle className="w-5 h-5 text-amber-500" /></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="review">Access Review</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Role</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Role name (e.g. hr_manager)" />
              <Input value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} placeholder="Role description" />
              <Button onClick={handleCreateRole} disabled={saving}><Plus className="w-4 h-4 mr-2" />Create Role</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Role Directory</CardTitle>
                <div className="relative w-72 max-w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" placeholder="Search role" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <p className="text-sm text-muted-foreground">Loading roles...</p> : filteredRoles.map((role) => (
                <div key={role.roleId} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">{role.description || "No description"}</p>
                    <Badge variant="outline" className="mt-2">{role.userCount} users</Badge>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteRole(role.roleId)} disabled={saving || role.userCount > 0}>
                    <Trash2 className="w-4 h-4 mr-1" />Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permission Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? <p className="text-sm text-muted-foreground">Loading policies...</p> : policyEditors.map((policy, idx) => (
                <div key={policy.policyId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-xs text-muted-foreground">{policy.policyId}</p>
                    </div>
                    <Button size="sm" onClick={() => handleSavePolicy(policy.policyId, policy.permissionsText)} disabled={saving}>Save</Button>
                  </div>
                  <div>
                    <Label className="text-xs">Permissions (one per line)</Label>
                    <Textarea
                      className="mt-1 min-h-28"
                      value={policy.permissionsText}
                      onChange={(e) => {
                        const next = [...policyEditors];
                        next[idx] = { ...next[idx], permissionsText: e.target.value };
                        setPolicyEditors(next);
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access Review</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground">Loading access review...</p> : (
                <div className="space-y-3">
                  {accessReview.map((user) => (
                    <div key={user.userId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {user.lastActivityAtUtc ? new Date(user.lastActivityAtUtc).toLocaleString() : "No activity"}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {user.roles.length === 0 ? (
                          <Badge variant="destructive">No roles</Badge>
                        ) : user.roles.map((role) => (
                          <Badge key={`${user.userId}-${role}`} variant="outline">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantIdentityAccess;
