import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[]; // If multiple permissions: requires ANY of them
  requireAll?: boolean; // If true, requires ALL permissions
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom fallback; defaults to null (hidden)
  showLoading?: React.ReactNode; // What to show while loading permissions
}

/**
 * Component to gate content based on user permissions.
 * 
 * Default behavior (safe for security):
 * - While loading: shows nothing (or showLoading prop)
 * - If no permission: renders fallback (default: null/hidden)
 * - If has permission: renders children
 *
 * Usage - Single permission:
 *   <PermissionGate permission="employee:invite">
 *     <InviteButton />
 *   </PermissionGate>
 *
 * Usage - Multiple permissions (requires ANY):
 *   <PermissionGate permissions={['employee:invite', 'admin:manage']}>
 *     <ManageButton />
 *   </PermissionGate>
 *
 * Usage - Multiple permissions (requires ALL):
 *   <PermissionGate permissions={['employee:invite', 'org:edit']} requireAll>
 *     <ManageButton />
 *   </PermissionGate>
 *
 * Usage - With loading state:
 *   <PermissionGate 
 *     permission="file:upload"
 *     showLoading={<Skeleton />}
 *   >
 *     <UploadButton />
 *   </PermissionGate>
 *
 * Usage - With custom fallback:
 *   <PermissionGate 
 *     permission="file:delete"
 *     fallback={<span className="text-gray-400">Delete disabled</span>}
 *   >
 *     <DeleteButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll,
  children,
  fallback = null,
  showLoading = null,
}: PermissionGateProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isLoading,
    isError,
  } = usePermissions();

  // Show loading state while fetching permissions
  if (isLoading) {
    return <>{showLoading}</>;
  }

  // If error fetching permissions, deny access by default (secure)
  if (isError) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = hasAllPermissions(permissions);
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

