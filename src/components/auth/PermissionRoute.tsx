import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import type { JSX } from 'react';

interface PermissionRouteProps {
  /** Single permission required */
  permission?: string;
  /** Require ANY of these permissions */
  permissions?: string[];
  /** Require ALL of these permissions (default: any) */
  requireAll?: boolean;
  /** Where to redirect if access is denied (default: /dashboard) */
  redirectTo?: string;
  /** The page to render when access is granted */
  children: JSX.Element;
}

/**
 * Route-level permission guard.
 * Redirects to `redirectTo` (default: /dashboard) if the user lacks the required permission.
 * Shows nothing while permissions are still loading to avoid flicker.
 *
 * Usage in App.tsx:
 *   <Route
 *     path="/employees"
 *     element={
 *       <PermissionRoute permission="employee:view">
 *         <EmployeesPage />
 *       </PermissionRoute>
 *     }
 *   />
 */
export default function PermissionRoute({
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/dashboard',
  children,
}: PermissionRouteProps): JSX.Element | null {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Don't render (or redirect) while permissions are still fetching
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // No permission specified — allow everyone
    hasAccess = true;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
