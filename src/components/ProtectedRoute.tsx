import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

/**
 * Route-level component to enforce permission-based access control
 * 
 * Usage in router config:
 *   <Route
 *     path="/employees"
 *     element={
 *       <ProtectedRoute permission="employee:view">
 *         <EmployeesPage />
 *       </ProtectedRoute>
 *     }
 *   />
 * 
 * Multiple permissions (requires any):
 *   <ProtectedRoute permissions={['admin:view', 'hr:view']}>
 *     <AdminPage />
 *   </ProtectedRoute>
 * 
 * Multiple permissions (requires all):
 *   <ProtectedRoute permissions={['org:view', 'org:edit']} requireAll>
 *     <OrgSettingsPage />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
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
  } else {
    // No permissions specified - always allow
    hasAccess = true;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
