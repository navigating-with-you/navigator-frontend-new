/**
 * RBAC Permission Definitions and Constants
 * Matches backend permissions exactly in constants/permissions.py
 * 
 * All permission strings are defined as constants to prevent typos.
 * Use these constants instead of magic strings throughout the app.
 */

export const PERMISSIONS = {
  // Organization
  ORG_VIEW: 'org:view',
  ORG_EDIT: 'org:edit',
  ORG_DELETE: 'org:delete',

  // Billing
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',

  // Team Management
  EMPLOYEE_VIEW: 'employee:view',
  EMPLOYEE_INVITE: 'employee:invite',
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_DELETE: 'employee:delete',
  INVITE_RESEND: 'invite:resend',
  INVITE_REVOKE: 'invite:revoke',

  // Groups
  GROUP_VIEW: 'group:view',
  GROUP_CREATE: 'group:create',
  GROUP_UPDATE: 'group:update',
  GROUP_DELETE: 'group:delete',
  GROUP_MANAGE_MEMBERS: 'group:manage_members',

  // Knowledge Base - Folders
  FOLDER_VIEW: 'folder:view',
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_MOVE: 'folder:move',

  // Knowledge Base - Files
  FILE_VIEW: 'file:view',
  FILE_UPLOAD: 'file:upload',
  FILE_UPDATE: 'file:update',
  FILE_DELETE: 'file:delete',
  FILE_MOVE: 'file:move',
  FILE_COPY: 'file:copy',
  FILE_DOWNLOAD: 'file:download',

  // Access Control
  ACCESS_VIEW: 'access:view',
  ACCESS_GRANT: 'access:grant',
  ACCESS_REVOKE: 'access:revoke',

  // Sharing
  SHARE_FOLDER_GROUP: 'share:folder_group',
  SHARE_FOLDER_INDIVIDUAL: 'share:folder_individual',
  SHARE_FILE_GROUP: 'share:file_group',
  SHARE_FILE_INDIVIDUAL: 'share:file_individual',

  // Chat
  CHAT_USE: 'chat:use',
  CHAT_HISTORY: 'chat:history',
  CHAT_DELETE_OWN: 'chat:delete_own',
  CHAT_DELETE_ANY: 'chat:delete_any',

  // Integrations
  INTEGRATION_VIEW: 'integration:view',
  INTEGRATION_CONNECT: 'integration:connect',
  INTEGRATION_DISCONNECT: 'integration:disconnect',

  // Settings & Profile
  PROFILE_VIEW: 'profile:view',
  PROFILE_EDIT: 'profile:edit',
  AUDIT_VIEW: 'audit:view',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  MEMBER: 'member',
} as const;

/**
 * Role to Permissions mapping
 * Defines what permissions each role has.
 * Source of truth for frontend UI state, but actual enforcement happens on backend.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
  [ROLES.ADMIN]: [
    // Organization
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.BILLING_VIEW,

    // Team
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_INVITE,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.INVITE_RESEND,
    PERMISSIONS.INVITE_REVOKE,

    // Groups
    PERMISSIONS.GROUP_VIEW,
    PERMISSIONS.GROUP_CREATE,
    PERMISSIONS.GROUP_UPDATE,
    PERMISSIONS.GROUP_DELETE,
    PERMISSIONS.GROUP_MANAGE_MEMBERS,

    // KB Folders
    PERMISSIONS.FOLDER_VIEW,
    PERMISSIONS.FOLDER_CREATE,
    PERMISSIONS.FOLDER_UPDATE,
    PERMISSIONS.FOLDER_MOVE,

    // KB Files
    PERMISSIONS.FILE_VIEW,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_UPDATE,
    PERMISSIONS.FILE_MOVE,
    PERMISSIONS.FILE_COPY,
    PERMISSIONS.FILE_DOWNLOAD,

    // Sharing & Access
    PERMISSIONS.ACCESS_VIEW,
    PERMISSIONS.ACCESS_GRANT,
    PERMISSIONS.ACCESS_REVOKE,
    PERMISSIONS.SHARE_FOLDER_GROUP,
    PERMISSIONS.SHARE_FOLDER_INDIVIDUAL,
    PERMISSIONS.SHARE_FILE_GROUP,
    PERMISSIONS.SHARE_FILE_INDIVIDUAL,

    // Chat
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CHAT_HISTORY,
    PERMISSIONS.CHAT_DELETE_ANY,

    // Integrations
    PERMISSIONS.INTEGRATION_VIEW,
    PERMISSIONS.INTEGRATION_CONNECT,
    PERMISSIONS.INTEGRATION_DISCONNECT,

    // Profile & Audit
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.AUDIT_VIEW,
  ],
  [ROLES.EDITOR]: [
    // KB Folders
    PERMISSIONS.FOLDER_VIEW,
    PERMISSIONS.FOLDER_CREATE,
    PERMISSIONS.FOLDER_UPDATE,
    PERMISSIONS.FOLDER_MOVE,

    // KB Files
    PERMISSIONS.FILE_VIEW,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_UPDATE,
    PERMISSIONS.FILE_MOVE,
    PERMISSIONS.FILE_COPY,
    PERMISSIONS.FILE_DOWNLOAD,

    // Sharing
    PERMISSIONS.SHARE_FILE_GROUP,
    PERMISSIONS.SHARE_FILE_INDIVIDUAL,
    PERMISSIONS.ACCESS_VIEW,

    // Chat
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CHAT_HISTORY,
    PERMISSIONS.CHAT_DELETE_OWN,

    // Profile
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
  ],
  [ROLES.MEMBER]: [
    // Groups - can view groups they're assigned to
    PERMISSIONS.GROUP_VIEW,

    // KB - read-only
    PERMISSIONS.FOLDER_VIEW,
    PERMISSIONS.FILE_VIEW,
    PERMISSIONS.FILE_DOWNLOAD,

    // Chat
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CHAT_HISTORY,
    PERMISSIONS.CHAT_DELETE_OWN,

    // Profile & Access
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    PERMISSIONS.ACCESS_VIEW,

    // Integrations - members can connect their own integrations
    PERMISSIONS.INTEGRATION_VIEW,
    PERMISSIONS.INTEGRATION_CONNECT,
    PERMISSIONS.INTEGRATION_DISCONNECT,
  ],
} as const;

/**
 * Feature flags based on role (UI hints only)
 * These are derived from ROLE_PERMISSIONS for convenience in the UI.
 * IMPORTANT: Don't rely on these for security - always check permissions from backend.
 */
export const FEATURE_FLAGS = {
  // Organization
  canViewOrg: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canEditOrg: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canDeleteOrg: [ROLES.SUPER_ADMIN],

  // Billing
  canViewBilling: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canManageBilling: [ROLES.SUPER_ADMIN],

  // Team Management
  canInviteUsers: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canManageTeam: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canDeleteEmployee: [ROLES.SUPER_ADMIN],

  // Groups
  canCreateGroups: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canManageGroups: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Knowledge Base
  canUploadFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  canCreateFolders: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  canDeleteFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canDeleteFolders: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canEditFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  canMoveFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  canCopyFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],

  // Sharing
  canShareFolders: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  canShareFiles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR],
  canManageAccess: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // Integrations
  canManageIntegrations: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.MEMBER],

  // Audit
  canViewAuditLogs: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
} as const;

/**
 * Check if a role can access a feature (UI hint only)
 * @param role - The role to check
 * @param feature - The feature flag key from FEATURE_FLAGS
 * @returns true if the role has access to the feature
 * 
 * IMPORTANT: This is for UI hints only. Always rely on permission checks from the backend.
 */
export function canAccessFeature(role: string, feature: keyof typeof FEATURE_FLAGS): boolean {
  const allowedRoles = FEATURE_FLAGS[feature];
  return allowedRoles.includes(role as any);
}

/**
 * Get all permissions for a role
 * @param role - The role to get permissions for
 * @returns Array of permission strings
 */
export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}

/**
 * Check if a role has a specific permission
 * @param role - The role to check
 * @param permission - The permission to check
 * @returns true if the role has this permission
 */
export function roleHasPermission(role: string, permission: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Get role description for display
 * @param role - The role identifier
 * @returns Human-readable role description
 */
export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    [ROLES.SUPER_ADMIN]: 'Super Admin - Full system access',
    [ROLES.ADMIN]: 'Admin - Manage organization and team',
    [ROLES.EDITOR]: 'Editor - Create and edit content',
    [ROLES.MEMBER]: 'Member - View and use content',
  };
  return descriptions[role] || role;
}

