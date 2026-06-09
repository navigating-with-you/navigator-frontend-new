import { useQuery } from '@tanstack/react-query';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { apiClient } from '@/utils/apiClient';

export interface UserPermissions {
  permissions: string[];
  role: string;
  role_id: string;
  organization_id: string;
}

/**
 * Hook to fetch and check user permissions.
 * Uses the same Kinde token + apiClient pattern as the rest of the app.
 *
 * Features:
 * - Caches permissions for 5 minutes (rarely change)
 * - Degrades gracefully on error (shows nothing rather than crashing)
 * - Handles loading state properly
 * - Type-safe permission checking
 *
 * Usage:
 *   const { hasPermission, isLoading, error } = usePermissions();
 *   if (hasPermission('employee:invite')) { ... }
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <div>Failed to load permissions</div>;
 */
export function usePermissions() {
  const { getToken, isAuthenticated } = useKindeAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return apiClient.get<UserPermissions>('/rbac/me/permissions', {
        token,
        // Permissions change infrequently — 5 min cache is fine
        cacheTTL: 5 * 60 * 1000,
      });
    },
    // Only run when the user is authenticated
    enabled: isAuthenticated,
    // Keep data in cache for 5 minutes; don't refetch during this time
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes so it persists across page navigations
    gcTime: 10 * 60 * 1000,
    // Retry once on failure, then degrade gracefully
    retry: 1,
    // Never throw to error boundary
    throwOnError: false,
  });

  /**
   * Check if user has a specific permission.
   * While loading, returns false (safer than true).
   * On error, returns false (deny access if we can't verify).
   */
  const hasPermission = (permission: string): boolean => {
    if (isLoading) return false; // Don't show features while loading
    if (!data?.permissions) return false;
    return data.permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the provided permissions.
   * Returns false while loading or on error (safe default).
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isLoading) return false;
    if (!data?.permissions) return false;
    return permissions.some(p => data.permissions.includes(p));
  };

  /**
   * Check if user has ALL of the provided permissions.
   * Returns false while loading or on error (safe default).
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (isLoading) return false;
    if (!data?.permissions) return false;
    return permissions.every(p => data.permissions.includes(p));
  };

  /**
   * Get the current user's role name.
   * Returns null while loading or on error.
   */
  const getUserRole = (): string | null => {
    if (isLoading || !data) return null;
    return data.role || null;
  };

  /**
   * Check if user is a specific role.
   * Returns false while loading or on error.
   */
  const isRole = (roleName: string): boolean => {
    if (isLoading || !data) return false;
    return data.role === roleName;
  };

  return {
    // Data
    permissions: data?.permissions || [],
    role: data?.role || null,
    roleId: data?.role_id || null,
    organizationId: data?.organization_id || null,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Role checks
    getUserRole,
    isRole,

    // Loading/error states
    isLoading,
    error,
    isError: !!error,
  };
}

