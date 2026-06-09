import React, { useMemo, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Search, X, Trash2, Mail, Pencil, FolderPlus } from "lucide-react";
import { PageActionButton } from "@/components/ui/page-action-button";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type Employee } from "@/types/employee";
import EmployeeTable from "@/components/employees/EmployeeTable";
import ColumnSettings from "@/components/ui/ColumnSettings";

const EMPLOYEE_COLUMNS = [
    { key: "name", label: "Employee Name" },
    { key: "status", label: "Status" },
    { key: "employeeCode", label: "Employee Code" },
    { key: "kbFiles", label: "No. Of KB Files" },
    { key: "simpleInteraction", label: "Simple Interaction" },
    { key: "complexInteraction", label: "Complex Interaction" },
    { key: "id", label: "Employee ID" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "category", label: "Categories" },
    { key: "createdBy", label: "Created By" },
    { key: "createdDate", label: "Created Date" },
];

const DEFAULT_EMPLOYEE_COLUMNS = ["name", "kbFiles", "simpleInteraction", "complexInteraction"];
import EmptyState from "@/components/employees/EmptyState";
import UnifiedEmptyState from "@/components/ui/empty-state";
import AddEmployeeDrawer from "@/components/employees/AddEmployeeDrawer";
import EmployeeDetailsDrawer from "@/components/employees/EmployeeDrawer";
import EditEmployeeDrawer from "@/components/employees/EditEmployeeDrawer";
import FilterDropdown from "@/components/FilterDropdown";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

import { listEmployees, listInvites, resendInvite, revokeInvite, listRoles, deleteEmployee, listGroups } from "@/lib/api";

import { SkeletonTable } from "@/components/ui/skeleton-table";

export type Filters = {
    status: Employee["status"] | "";
    role: string;
    category: string;
};


export default function EmployeesPage() {
    const { getToken, isAuthenticated, user } = useKindeAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentUserEmployee, setCurrentUserEmployee] = useState<Employee | null>(null);
    const [superAdminExists, setSuperAdminExists] = useState<boolean>(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem("employee_visible_columns");
        return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEE_COLUMNS;
    });

    useEffect(() => {
        localStorage.setItem("employee_visible_columns", JSON.stringify(visibleColumns));
    }, [visibleColumns]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);

    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState<boolean>(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [search, setSearch] = useState<string>("");

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
    const [confirmBatchRevoke, setConfirmBatchRevoke] = useState(false);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    const selectedEmployees = useMemo(() => {
        return employees.filter((emp) => selected.has(emp.id));
    }, [employees, selected]);

    const allPending = useMemo(() => {
        return selectedEmployees.length > 0 && selectedEmployees.every((emp) => emp.status === "pending" || emp.isActive === false);
    }, [selectedEmployees]);

    const handleBatchDelete = async () => {
        setIsBatchProcessing(true);
        try {
            const promises = selectedEmployees.map(async (emp) => {
                if (emp.isActive !== false) {
                    await handleDeleteEmployee(emp.id);
                } else {
                    await handleRevokeInvite(emp.inviteId || emp.id);
                }
            });
            await Promise.all(promises);
            setSelected(new Set());
        } catch (error) {
            console.error("Batch delete error", error);
        } finally {
            setIsBatchProcessing(false);
            setConfirmBatchDelete(false);
        }
    };

    const handleBatchResend = async () => {
        setIsBatchProcessing(true);
        try {
            const promises = selectedEmployees.map(async (emp) => {
                await handleResendInvite(emp.inviteId || emp.id);
            });
            await Promise.all(promises);
            setSelected(new Set());
        } catch (error) {
            console.error("Batch resend error", error);
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleBatchRevoke = async () => {
        setIsBatchProcessing(true);
        try {
            const promises = selectedEmployees.map(async (emp) => {
                await handleRevokeInvite(emp.inviteId || emp.id);
            });
            await Promise.all(promises);
            setSelected(new Set());
        } catch (error) {
            console.error("Batch revoke error", error);
        } finally {
            setIsBatchProcessing(false);
            setConfirmBatchRevoke(false);
        }
    };

    const [filters, setFilters] = useState<Filters>({
        status: "",
        role: "",
        category: "",
    });

    const [batchTeamPickerOpen, setBatchTeamPickerOpen] = useState(false);
    const [selectedGroupBatch, setSelectedGroupBatch] = useState<string>("");
    const [isBatchAdding, setIsBatchAdding] = useState(false);

    const isEmpty = employees.length === 0;

    const fetchEmployees = useCallback(async (showSkeleton = false) => {
        try {
            if (showSkeleton || employees.length === 0) {
                setIsLoading(true);
            }
            const token = await getToken();
            if (!token) {
                toast.error("Not authenticated");
                setIsLoading(false);
                return;
            }

            // Fetch active employee list, pending invites, RBAC roles, and Teams/Groups in parallel
            const [empData, inviteData, rolesData, groupsData] = await Promise.all([
                listEmployees(token).catch(err => {
                    console.error("Error fetching employees:", err);
                    return { employees: [] };
                }),
                listInvites(token).catch(err => {
                    console.error("Error fetching invites:", err);
                    return [];
                }),
                listRoles(token).catch(err => {
                    console.error("Error fetching roles:", err);
                    return [];
                }),
                listGroups(token).catch(err => {
                    console.error("Error fetching groups/teams:", err);
                    return [];
                })
            ]);

            const rawEmployeeList = empData?.employees || (Array.isArray(empData) ? empData : []);
            const employeeList = rawEmployeeList.filter((emp: any) => {
                if (!user?.email) return true;
                return emp.email?.toLowerCase() !== user.email.toLowerCase();
            });
            const inviteList = empData?.pending_invites || (Array.isArray(inviteData) ? inviteData : ((inviteData as any)?.invites || []));
            const rolesList = Array.isArray(rolesData) ? (rolesData as any) : [];
            // Handle paginated groups response: items array or fallback to groups or empty
            const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData?.items || groupsData?.groups || []);
            setTeams(groupsList.map((g: any) => ({ id: g.id, name: g.name })));

            const roleNames = rolesList.map((r: any) => {
                return r.name === "super_admin"
                    ? "Super Admin"
                    : r.name.charAt(0).toUpperCase() + r.name.slice(1);
            });
            setRoleOptions(roleNames);

            const mappedEmployees: Employee[] = employeeList.map((emp: any) => {
                const firstName = emp.first_name || emp.given_name || "";
                const lastName = emp.last_name || emp.family_name || "";
                const fullName = emp.display_name || `${firstName} ${lastName}`.trim() || emp.name || emp.email?.split("@")[0] || "Unknown Employee";

                let rawRole = "member";
                if (emp.role && typeof emp.role === "object") {
                    rawRole = emp.role.name;
                } else if (emp.role && typeof emp.role === "string") {
                    rawRole = emp.role;
                } else if (emp.role_id) {
                    const foundRole = rolesList.find((r: any) => r.id === emp.role_id);
                    if (foundRole) {
                        rawRole = foundRole.name;
                    }
                }

                const roleName = rawRole === "super_admin"
                    ? "Super Admin"
                    : rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

                // Ensure email is always a string, not "-"
                const email = emp.email && typeof emp.email === "string" && emp.email.trim() ? emp.email.trim() : "";

                return {
                    id: emp.id || `EMP-${Date.now()}`,
                    inviteId: emp.invite_id || emp.id,
                    name: fullName,
                    role: roleName,
                    category: emp.category || "-",
                    avatar: emp.avatar_url || emp.avatar || "",
                    status: "accepted",
                    kbFiles: emp.kb_files !== undefined && emp.kb_files !== null ? emp.kb_files : "-",
                    simpleInteraction: emp.simple_interaction !== undefined && emp.simple_interaction !== null ? emp.simple_interaction : "-",
                    complexInteraction: emp.complex_interaction !== undefined && emp.complex_interaction !== null ? emp.complex_interaction : "-",
                    email: email,
                    createdBy: emp.created_by || emp.createdBy || "Admin",
                    createdDate: emp.created_at
                        ? new Date(emp.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                        : "-",
                    isActive: emp.is_active !== undefined ? !!emp.is_active : true,
                    employeeCode: emp.employee_code || null,
                };
            });

            const mappedInvites: Employee[] = inviteList
                .filter((inv: any) => inv.status === "pending" || inv.status === "sent")
                .map((inv: any) => {
                    const firstName = inv.first_name || "";
                    const lastName = inv.last_name || "";
                    const fullName = `${firstName} ${lastName}`.trim() || inv.email?.split("@")[0] || "Invited Employee";

                    let rawRole = "member";
                    if (inv.role && typeof inv.role === "object") {
                        rawRole = inv.role.name;
                    } else if (inv.role && typeof inv.role === "string") {
                        rawRole = inv.role;
                    } else if (inv.role_id) {
                        const foundRole = rolesList.find((r: any) => r.id === inv.role_id);
                        if (foundRole) {
                            rawRole = foundRole.name;
                        }
                    }

                    const roleName = rawRole === "super_admin"
                        ? "Super Admin"
                        : rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

                    // Ensure email is always a string, not "-"
                    const email = inv.email && typeof inv.email === "string" && inv.email.trim() ? inv.email.trim() : "";

                    return {
                        id: inv.id,
                        inviteId: inv.id,
                        name: fullName,
                        role: roleName,
                        category: "-",
                        avatar: "",
                        status: "pending",
                        kbFiles: "-",
                        simpleInteraction: "-",
                        complexInteraction: "-",
                        email: email,
                        createdBy: "Admin",
                        createdDate: inv.invited_at || inv.created_at
                            ? new Date(inv.invited_at || inv.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                            : "-",
                        isActive: false,
                        employeeCode: inv.employee_code || null,
                    };
                });

            // Prevent duplicate emails across active employees and pending invites
            const activeEmails = new Set(mappedEmployees.map(e => e.email.toLowerCase()));
            const uniqueInvites = mappedInvites.filter(inv => !activeEmails.has(inv.email.toLowerCase()));

            // Separate current user from employees
            let currentUser: Employee | null = null;
            const filteredEmployees = [...mappedEmployees, ...uniqueInvites].filter((emp) => {
                if (!user?.email) return true;
                const isCurrentUser = emp.email?.toLowerCase() === user.email.toLowerCase();
                if (isCurrentUser) {
                    currentUser = emp;
                    return false;
                }
                return true;
            });

            setCurrentUserEmployee(currentUser);
            // Determine if any super admin exists in employees or invites
            const anySuper = [...mappedEmployees, ...mappedInvites].some(e => (e.role || "").toLowerCase().replace(/\s+/g, "_") === "super_admin");
            setSuperAdminExists(anySuper);

            // creators removed — no longer building creator filter list
            setEmployees(filteredEmployees);
        } catch (error: any) {
            console.error("Fetch employees error:", error);
            toast.error(error.message || "Failed to load employees");
            setEmployees([]);
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    const handleResendInvite = async (inviteId: string) => {
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Not authenticated");
                return;
            }
            await resendInvite(inviteId, token);
            toast.success("Invitation resent successfully");
        } catch (error: any) {
            console.error("Resend invite error:", error);
            toast.error(error.message || "Failed to resend invite");
        }
    };

    const handleRevokeInvite = async (inviteId: string) => {
        const prevEmployees = [...employees];
        setEmployees(prev => prev.filter(e => e.inviteId !== inviteId));
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Not authenticated");
                setEmployees(prevEmployees);
                return;
            }
            await revokeInvite(inviteId, token);
            toast.success("Invitation revoked successfully");
        } catch (error: any) {
            setEmployees(prevEmployees);
            console.error("Revoke invite error:", error);
            toast.error(error.message || "Failed to revoke invite");
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchEmployees(true);

            return () => {
                // Manual refresh will be triggered via UI actions instead of WebSocket
            };
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, fetchEmployees]);

    const uniqueStatuses = useMemo(() => {
        const list = new Set<string>();
        employees.forEach((emp) => {
            if (emp.status) {
                const capitalized = emp.status.charAt(0).toUpperCase() + emp.status.slice(1);
                list.add(capitalized);
            }
        });
        return Array.from(list).sort();
    }, [employees]);



    const filteredEmployees = useMemo(() => {
        const query = search.toLowerCase().trim();
        const { status, role, category } = filters;

        return employees.filter((emp) => {
            // Filters (check first as they're faster)
            if (status && (emp.status || "").trim().toLowerCase() !== status.trim().toLowerCase()) return false;
            if (role && (emp.role || "").trim().toLowerCase() !== role.trim().toLowerCase()) return false;
            if (category && (emp.category || "").trim().toLowerCase() !== category.trim().toLowerCase()) return false;

            // Search - includes name, email, id, role, category, createdBy, and employeeCode
            if (query) {
                const searchableText = `${emp.name} ${emp.id} ${emp.email} ${emp.role} ${emp.category} ${emp.createdBy} ${emp.employeeCode || ""}`.toLowerCase();
                if (!searchableText.includes(query)) return false;
            }

            return true;
        });
    }, [employees, search, filters.status, filters.role, filters.category]);

    const isNoResults = !isEmpty && filteredEmployees.length === 0;

    const handleAddEmployee = (newEmp: any, _invite: boolean) => {
        // Optimistically add to employees state
        setEmployees(prev => {
            const exists = prev.some(e => e.email.toLowerCase() === newEmp.email.toLowerCase());
            if (exists) return prev;
            const newEmployeeItem: Employee = {
                id: newEmp.id || `inv-${Date.now()}`,
                inviteId: newEmp.id || `inv-${Date.now()}`,
                name: newEmp.name,
                role: newEmp.role,
                category: "-",
                avatar: "",
                status: "pending",
                kbFiles: 0,
                simpleInteraction: "-",
                complexInteraction: "-",
                email: newEmp.email,
                createdBy: user?.givenName ? `${user.givenName} ${user.familyName || ""}`.trim() : "Admin",
                createdDate: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
                isActive: false,
                employeeCode: newEmp.employeeCode || null,
            };
            return [...prev, newEmployeeItem];
        });
        setDrawerOpen(false);
    };

    const handleDeleteEmployee = async (id: string) => {
        const prevEmployees = [...employees];
        setEmployees(prev => prev.filter(e => e.id !== id));
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Not authenticated");
                setEmployees(prevEmployees);
                return;
            }
            await deleteEmployee(id, token);
            toast.success("Employee deleted successfully");
        } catch (error: any) {
            setEmployees(prevEmployees);
            console.error("Delete employee error:", error);
            toast.error(error.message || "Failed to delete employee");
        }
    };

    return (
        <PermissionGate
            permission={PERMISSIONS.EMPLOYEE_EDIT}
            fallback={
                <div className="p-3 sm:p-6 md:p-8 flex flex-col h-full w-full bg-transparent overflow-hidden">
                    <UnifiedEmptyState
                        title="Access Denied"
                        description="You don't have permission to view the employees page. Only managers and above can access this page."
                        testId="employees-access-denied"
                    />
                </div>
            }
            showLoading={
                <div className="p-3 sm:p-6 md:p-8 flex flex-col h-full w-full bg-transparent overflow-hidden items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading permissions...</p>
                    </div>
                </div>
            }
        >
            <div className="p-3 sm:p-6 md:p-8 flex flex-col h-full w-full bg-transparent overflow-hidden" data-testid="employees-page" data-tour="employees-page">
                {/* Header - Fixed */}
                <div className="shrink-0 flex flex-col gap-1">
                    <div className="flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Employees
                            </h1>

                            {!isLoading && (
                                <Badge className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    {employees.length}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center">
                            <Button
                                variant="outline"
                                className="gap-2 rounded-lg border-[#E7E7E0] bg-[#FEFFFA] hover:bg-[#F5F5F0] dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
                                onClick={() => fetchEmployees()}
                                disabled={isLoading}
                            >
                                <RefreshCw className={cn("h-4 w-4 text-zinc-500 dark:text-zinc-400", isLoading && "animate-spin")} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                        </div>
                    </div>

                    {/* Batch Add to Team Dialog */}
                    <Dialog open={batchTeamPickerOpen} onOpenChange={(open) => !open && setBatchTeamPickerOpen(false)}>
                        <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                            <DialogHeader>
                                <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Add Selected to Team</DialogTitle>
                                <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                                    Select a team to add the {selected.size} selected employees to.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-4">
                                <Select value={selectedGroupBatch} onValueChange={setSelectedGroupBatch}>
                                    <SelectTrigger className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium w-full">
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="mt-6 gap-2">
                                <Button variant="outline" onClick={() => setBatchTeamPickerOpen(false)} disabled={isBatchAdding} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (!selectedGroupBatch || selected.size === 0) return;
                                        setIsBatchAdding(true);
                                        try {
                                            const token = await getToken();
                                            if (!token) throw new Error("Not authenticated");
                                            const ids = Array.from(selected);
                                            await (await import("@/lib/api")).addGroupMembers(selectedGroupBatch, ids, token);
                                            toast.success(`Added ${ids.length} employees to team`);
                                            setSelected(new Set());
                                            setBatchTeamPickerOpen(false);
                                            
                                            // Clear the groups/categories cache so team membership updates are fetched
                                            const { cacheManager } = await import("@/utils/cacheManager");
                                            cacheManager.invalidatePattern("/groups/");
                                            
                                            // Refresh employee list to reflect team membership changes
                                            await fetchEmployees(false);
                                        } catch (err: any) {
                                            console.error("Batch add to team error", err);
                                            toast.error(err?.message || "Failed to add to team");
                                        } finally {
                                            setIsBatchAdding(false);
                                        }
                                    }}
                                    disabled={isBatchAdding || !selectedGroupBatch}
                                    className="rounded-lg h-10 px-4 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    {isBatchAdding ? "Adding..." : "Add to Team"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Manage your team members, their roles, access permissions, and track their activity.
                    </p>
                </div>

                {/* My Profile Section */}
                {currentUserEmployee && (
                    <div className="mt-6 shrink-0 p-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                                <Avatar className="h-12 w-12 rounded-lg flex-shrink-0">
                                    <AvatarImage
                                        src={currentUserEmployee.avatar}
                                        alt={currentUserEmployee.name}
                                    />
                                    <AvatarFallback className="rounded-lg text-sm font-medium">
                                        {currentUserEmployee.name
                                            ? currentUserEmployee.name
                                                .split(" ")
                                                .filter(Boolean)
                                                .map((n: string) => n[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()
                                            : "ME"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {currentUserEmployee.name} (You)
                                    </h3>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                                        {currentUserEmployee.email}
                                    </p>
                                    {currentUserEmployee.employeeCode && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            <span className="font-medium">Code:</span> {currentUserEmployee.employeeCode}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                            {currentUserEmployee.role}
                                        </Badge>
                                        {currentUserEmployee.isActive !== false && (
                                            <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedEmployee(currentUserEmployee);
                                    setEditDrawerOpen(true);
                                }}
                                className="h-8 px-3 text-xs flex-shrink-0"
                            >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit Profile
                            </Button>
                        </div>
                    </div>
                )}

                {/* Import Avatar component if not already imported */}

                {/* Actions - Fixed */}
                <div className="mt-6 shrink-0 flex flex-wrap gap-3">
                    <PermissionGate
                        permission={PERMISSIONS.EMPLOYEE_INVITE}
                        fallback={
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <PageActionButton
                                                icon={<Plus className="h-3.5 w-3.5" />}
                                                label="Add"
                                                disabled
                                            />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                        You don't have permission to invite users
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        }
                    >
                        <PageActionButton
                            data-tour="add-employee-btn"
                            icon={<Plus className="h-3.5 w-3.5" />}
                            label="Add"
                            onClick={() => setDrawerOpen(true)}
                        />
                    </PermissionGate>


                </div>

                {/* Search - Fixed */}
                <div className="relative mt-5 shrink-0">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search employees by name or email..."
                        className="h-10 rounded-lg border-[#E7E7E0] dark:border-zinc-700 bg-[#FEFFFA] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filters or Batch Actions */}
                {selected.size > 0 ? (
                    <div className="mt-4 shrink-0 flex items-center justify-between gap-2 bg-transparent select-none">
                        <div className="flex items-center gap-2">
                            <PermissionGate
                                permission={PERMISSIONS.EMPLOYEE_DELETE}
                                fallback={null}
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isBatchProcessing}
                                    onClick={() => setConfirmBatchDelete(true)}
                                    className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-red-650 hover:text-red-700 dark:text-red-400 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    Delete
                                </Button>
                            </PermissionGate>

                            <PermissionGate permission={PERMISSIONS.GROUP_MANAGE_MEMBERS} fallback={null}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isBatchProcessing}
                                    onClick={() => setBatchTeamPickerOpen(true)}
                                    className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <FolderPlus className="h-3.5 w-3.5 text-zinc-500" />
                                    Add to Team
                                </Button>
                            </PermissionGate>

                            {allPending && (
                                <>
                                    <PermissionGate
                                        permission={PERMISSIONS.INVITE_RESEND}
                                        fallback={null}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isBatchProcessing}
                                            onClick={handleBatchResend}
                                            className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                            <Mail className="h-3.5 w-3.5 text-zinc-500" />
                                            Resend Invite
                                        </Button>
                                    </PermissionGate>

                                    <PermissionGate
                                        permission={PERMISSIONS.INVITE_REVOKE}
                                        fallback={null}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isBatchProcessing}
                                            onClick={() => setConfirmBatchRevoke(true)}
                                            className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-red-650 dark:text-red-400 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                            <X className="h-3.5 w-3.5 text-zinc-500" />
                                            Revoke
                                        </Button>
                                    </PermissionGate>
                                </>
                            )}
                        </div>
                        {/* Right side selection badge */}
                        <div className="flex items-center gap-1.5 px-2.5 h-6 border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900 rounded-md text-xs text-zinc-650 dark:text-zinc-300 font-normal shadow-sm">
                            <span>{selected.size} selected</span>
                            <button
                                type="button"
                                onClick={() => setSelected(new Set())}
                                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
                                aria-label="Clear selection"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div data-tour="employee-filters" className="mt-4 shrink-0 flex items-center justify-between gap-3 w-full select-none">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
                            <FilterDropdown
                                label="Status"
                                value={filters.status}
                                options={uniqueStatuses}
                                onChange={(v: any) =>
                                    setFilters((f) => ({ ...f, status: v }))
                                }
                            />

                            <FilterDropdown
                                label="Role"
                                value={filters.role}
                                options={roleOptions}
                                onChange={(v: string) =>
                                    setFilters((f) => ({ ...f, role: v }))
                                }
                            />

                            <FilterDropdown
                                label="Team"
                                value={filters.category}
                                options={teams.map((t) => t.name)}
                                onChange={(v: string) =>
                                    setFilters((f) => ({ ...f, category: v }))
                                }
                            />

                            {/* Creator filter removed */}
                        </div>
                        <div className="shrink-0 pb-1 flex items-center gap-2">
                            <ColumnSettings
                                columns={EMPLOYEE_COLUMNS}
                                visibleColumns={visibleColumns}
                                onApply={setVisibleColumns}
                                defaultColumns={DEFAULT_EMPLOYEE_COLUMNS}
                            />
                        </div>
                    </div>
                )}

                {/* Body - Pinned Layout */}
                <div className="mt-4 flex-1 flex flex-col min-h-0">
                    {isLoading ? (
                        <SkeletonTable
                            gridCols="[2.5fr_1.5fr_1.5fr_1.5fr_56px]"
                            headers={[
                                "Employee Name",
                                "No. Of KB Files",
                                "Simple Interaction",
                                "Complex Interaction",
                                "",
                            ]}
                            columns={[
                                {
                                    width: "w-40",
                                    render: () => (
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
                                            <div className="space-y-1.5 flex-1">
                                                <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                                                <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    ),
                                },
                                { width: "w-8" },
                                { width: "w-12" },
                                { width: "w-12" },
                                { width: "w-8", render: () => <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> },
                            ]}
                        />
                    ) : isEmpty ? (
                        <EmptyState />
                    ) : isNoResults ? (
                        <UnifiedEmptyState
                            title={search ? `No results found for "${search}"` : "No results found"}
                            description="Try adjusting your filters or search terms."
                            testId="employees-search-empty-state"
                        />
                    ) : (
                        <EmployeeTable
                            employees={filteredEmployees}
                            onDelete={handleDeleteEmployee}
                            onView={(emp) => {
                                setSelectedEmployee(emp);
                                setDetailDrawerOpen(true);
                            }}
                            onEdit={(emp) => {
                                setSelectedEmployee(emp);
                                setEditDrawerOpen(true);
                            }}
                            onResendInvite={handleResendInvite}
                            onRevokeInvite={handleRevokeInvite}
                            currentUserEmail={user?.email ?? undefined}
                            selected={selected}
                            setSelected={setSelected}
                            visibleColumns={visibleColumns}
                        />
                    )}
                </div>

                <AddEmployeeDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    onSubmit={handleAddEmployee}
                    currentUserRole={currentUserEmployee?.role}
                    superAdminExists={superAdminExists}
                />

                <EmployeeDetailsDrawer
                    open={detailDrawerOpen}
                    onOpenChange={setDetailDrawerOpen}
                    employee={selectedEmployee}
                />

                <EditEmployeeDrawer
                    open={editDrawerOpen}
                    onOpenChange={setEditDrawerOpen}
                    employee={selectedEmployee}
                    onSave={(updated) => {
                        setEmployees(prev => prev.map(emp => emp.id === updated.id ? updated : emp));
                    }}
                    currentUserRole={currentUserEmployee?.role}
                    superAdminExists={superAdminExists}
                    currentUserId={currentUserEmployee?.id}
                />

                {/* Batch Delete Confirmation Dialog */}
                <Dialog open={confirmBatchDelete} onOpenChange={(open) => !open && setConfirmBatchDelete(false)}>
                    <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Delete Selected Employees</DialogTitle>
                            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                                Are you sure you want to delete the {selected.size} selected employees? This action cannot be undone and will permanently remove their access or revoke their invites.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-6 gap-2">
                            <Button variant="outline" onClick={() => setConfirmBatchDelete(false)} disabled={isBatchProcessing} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="bg-red-650 hover:bg-red-700 text-white rounded-lg"
                                disabled={isBatchProcessing}
                                onClick={handleBatchDelete}
                            >
                                {isBatchProcessing ? "Deleting..." : "Confirm Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Batch Revoke Confirmation Dialog */}
                <Dialog open={confirmBatchRevoke} onOpenChange={(open) => !open && setConfirmBatchRevoke(false)}>
                    <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Revoke Selected Invitations</DialogTitle>
                            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                                Are you sure you want to revoke invitations for the {selected.size} selected pending invitees? The invite links will no longer be valid.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-6 gap-2">
                            <Button variant="outline" onClick={() => setConfirmBatchRevoke(false)} disabled={isBatchProcessing} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="bg-red-650 hover:bg-red-700 text-white rounded-lg"
                                disabled={isBatchProcessing}
                                onClick={handleBatchRevoke}
                            >
                                {isBatchProcessing ? "Revoking..." : "Confirm Revoke"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PermissionGate>
    );
}