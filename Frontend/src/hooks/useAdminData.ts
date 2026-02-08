import { useQuery, useQueryClient } from "@tanstack/react-query";
import { platformClient as platform } from "@/integrations/platform/client";
import { huminexApi } from "@/integrations/api/client";
import { useEffect, useMemo } from "react";

// Centralized admin data hooks with stale-while-revalidate caching
// Shows cached data instantly while refreshing in background

// Aggressive caching for instant display with background refresh
const STALE_TIME = 2 * 60 * 1000; // 2 minutes - data shown instantly, refreshed in background after this
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes - keep cached data for longer
const BACKGROUND_REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes - auto-refresh
const LOCAL_BYPASS_ENABLED =
  import.meta.env.DEV === true &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  String(import.meta.env.VITE_ENABLE_LOCAL_INTERNAL_ADMIN_BYPASS ?? "true").toLowerCase() !== "false";

// Stats hook for dashboard overview - stale-while-revalidate pattern
export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        return {
          totalQuotes: 0,
          pendingQuotes: 0,
          totalInvoices: 0,
          totalRevenue: 0,
          totalUsers: 1,
          totalInquiries: 0,
          pendingOnboarding: 0,
          activeTenants: 0,
          totalEmployees: 0,
        };
      }

      const summary = await huminexApi.getInternalAdminSummary();

      return {
        totalQuotes: summary.auditEventsLast24Hours || 0,
        pendingQuotes: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        totalUsers: summary.employerAdmins || 0,
        totalInquiries: 0,
        pendingOnboarding: 0,
        activeTenants: summary.employerTenants || 0,
        totalEmployees: summary.totalEmployees || 0,
      };
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached data on mount
    refetchInterval: BACKGROUND_REFETCH_INTERVAL, // Background refresh
    placeholderData: (previousData) => previousData, // Show previous data while loading
  });
};

// Recent quotes hook - stale-while-revalidate
export const useRecentQuotes = (limit = 5) => {
  return useQuery({
    queryKey: ["admin-recent-quotes", limit],
    queryFn: async () => {
      const { data, error } = await platform
        .from("quotes")
        .select("id, quote_number, contact_name, contact_email, service_type, final_price, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// All quotes hook - stale-while-revalidate
export const useAllQuotes = () => {
  return useQuery({
    queryKey: ["admin-all-quotes"],
    queryFn: async () => {
      const { data, error } = await platform
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// Pending onboardings hook - stale-while-revalidate
export const usePendingOnboardings = (limit = 5) => {
  return useQuery({
    queryKey: ["admin-pending-onboardings", limit],
    queryFn: async () => {
      const { data, error } = await platform
        .from("onboarding_sessions")
        .select("id, client_id, full_name, email, company_name, client_type, status, created_at")
        .in("status", ["new", "pending", "pending_approval", "verified"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// Recent tenants hook - stale-while-revalidate
export const useRecentTenants = (limit = 5) => {
  return useQuery({
    queryKey: ["admin-recent-tenants", limit],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        return [];
      }

      const employers = await huminexApi.getInternalEmployers(limit);
      return employers.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        tenant_type: item.tenantType,
        status: item.status,
        created_at: item.createdAtUtc,
        updated_at: item.updatedAtUtc,
        admin_count: item.adminCount,
        employee_count: item.employeeCount,
        contact_email: item.contactEmail,
      }));
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// All tenants hook - stale-while-revalidate
export const useAllTenants = () => {
  return useQuery({
    queryKey: ["admin-all-tenants"],
    queryFn: async () => {
      const { data, error } = await platform
        .from("client_tenants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// Audit logs hook - stale-while-revalidate
export const useAuditLogs = (limit = 50) => {
  return useQuery({
    queryKey: ["admin-audit-logs", limit],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        return [];
      }

      const logs = await huminexApi.getInternalAuditLogs(limit);
      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity_type: log.resourceType,
        entity_id: log.resourceId,
        user_id: log.actorUserId,
        tenant_id: log.tenantId,
        actor_email: log.actorEmail,
        outcome: log.outcome,
        created_at: log.occurredAtUtc,
        metadata_json: log.metadataJson,
      }));
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });
};

export const useInternalAuditLogs = (limit = 10) => {
  return useQuery({
    queryKey: ["admin-internal-audit-logs", limit],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        try {
          const raw = localStorage.getItem("huminex_admin_auth_audit");
          const entries = raw ? (JSON.parse(raw) as Array<{ timestamp: string; portal: string; status: string; reason: string }>) : [];
          return entries
            .slice(-limit)
            .reverse()
            .map((event, index) => ({
              id: `local-${index}-${event.timestamp}`,
              action: "admin_auth_login",
              resourceType: event.portal || "internal_admin",
              resourceId: "/admin/login",
              actorEmail: "originxlabs@gmail.com",
              outcome: event.status || "attempt",
              occurredAt: event.timestamp,
            }));
        } catch {
          return [];
        }
      }

      const logs = await huminexApi.getInternalAuditLogs(limit);
      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        actorEmail: log.actorEmail,
        outcome: log.outcome,
        occurredAt: log.occurredAtUtc,
      }));
    },
    staleTime: 5000,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });
};

export const useInternalSystemLogs = (level = "all", limit = 200) => {
  return useQuery({
    queryKey: ["admin-internal-system-logs", level, limit],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        return [];
      }

      const logs = await huminexApi.getInternalSystemLogs(level, limit);
      return logs.map((log) => ({
        id: log.id,
        level: log.level,
        source: log.source,
        message: log.message,
        metadataJson: log.metadataJson,
        createdAt: log.createdAtUtc,
      }));
    },
    staleTime: 5000,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
  });
};

export const useInternalSystemHealth = () => {
  return useQuery({
    queryKey: ["admin-internal-system-health"],
    queryFn: async () => {
      if (LOCAL_BYPASS_ENABLED) {
        return {
          status: "healthy",
          checkedAtUtc: new Date().toISOString(),
          checks: [] as Array<{ name: string; status: string; latency: string; description: string }>,
        };
      }

      const health = await huminexApi.getInternalSystemHealth();
      return {
        status: health.status,
        checkedAtUtc: health.checkedAtUtc,
        checks: health.checks.map((check) => ({
          name: check.name,
          status: check.status,
          latency: check.latency,
          description: check.description,
        })),
      };
    },
    staleTime: 5000,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 15000,
    placeholderData: (previousData) => previousData,
  });
};

// Clickstream events hook - stale-while-revalidate with aggressive caching
export const useClickstreamEvents = (
  eventFilter: string = "all",
  timeRange: string = "24h",
  customDateRange?: { from: Date; to: Date } | null
) => {
  return useQuery({
    queryKey: ["clickstream-events", eventFilter, timeRange, customDateRange?.from?.toISOString(), customDateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = platform
        .from("clickstream_events")
        .select("id, session_id, event_type, page_url, element_text, created_at")
        .order("created_at", { ascending: false })
        .limit(50); // Further reduced for instant load

      if (eventFilter !== "all") {
        query = query.eq("event_type", eventFilter);
      }

      if (timeRange === "custom" && customDateRange) {
        query = query
          .gte("created_at", customDateRange.from.toISOString())
          .lte("created_at", customDateRange.to.toISOString());
      } else {
        const timeFilters: Record<string, number> = {
          "1h": 1, "24h": 24, "7d": 168, "30d": 720, "90d": 2160,
        };
        if (timeFilters[timeRange]) {
          const since = new Date();
          since.setHours(since.getHours() - timeFilters[timeRange]);
          query = query.gte("created_at", since.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // 1 minute - show cached data instantly
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// Real-time subscription hook for admin dashboard - optimized with longer debounce
export const useAdminRealtime = (tables: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = tables.map((table) => {
      return platform
        .channel(`admin-${table}-changes`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          // Longer debounce to prevent rapid re-renders (2 seconds)
          const timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
            queryClient.invalidateQueries({ queryKey: [`admin-${table}`] });
          }, 2000);
          return () => clearTimeout(timeoutId);
        })
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => platform.removeChannel(channel));
    };
  }, [queryClient, tables.join(",")]);
};

// Memoized table filter hook
export const useTableFilter = <T extends Record<string, any>>(
  data: T[] | undefined,
  searchTerm: string,
  searchFields: (keyof T)[]
) => {
  return useMemo(() => {
    if (!data || !searchTerm) return data || [];
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) =>
        String(item[field] || "").toLowerCase().includes(lowerSearch)
      )
    );
  }, [data, searchTerm, searchFields.join(",")]);
};
