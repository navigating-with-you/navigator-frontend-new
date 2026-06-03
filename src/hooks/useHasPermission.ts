import { useMemo } from 'react';
import { usePermissions } from './usePermissions';

/**
 * Lightweight hook for inline permission checks (alternative to PermissionGate component)
 * 
 * Usage:
 *   const { can } = useHasPermission();
 * 
 *   return (
 *     <>
 *       {can('employee:invite') && <InviteButton />}
 *       {can('group:create') && <AddGroupButton />}
 *       {canAny(['chat:delete_own', 'chat:delete_any']) && <DeleteButton />}
 *     </>
 *   );
 */
export function useHasPermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, permissions } = usePermissions();

  // Memoize the permission check functions to avoid unnecessary rerenders
  const memoizedFunctions = useMemo(
    () => ({
      /**
       * Check if user has a specific permission
       */
      can: (permission: string): boolean => {
        return hasPermission(permission);
      },

      /**
       * Check if user has ANY of the specified permissions
       */
      canAny: (perms: string[]): boolean => {
        return hasAnyPermission(perms);
      },

      /**
       * Check if user has ALL of the specified permissions
       */
      canAll: (perms: string[]): boolean => {
        return hasAllPermissions(perms);
      },

      /**
       * Check if user lacks a specific permission
       */
      cannot: (permission: string): boolean => {
        return !hasPermission(permission);
      },

      /**
       * Get all user permissions
       */
      getPermissions: (): string[] => {
        return permissions;
      },
    }),
    [hasPermission, hasAnyPermission, hasAllPermissions, permissions]
  );

  return {
    ...memoizedFunctions,
    isLoading,
  };
}
