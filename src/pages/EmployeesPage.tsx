import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, Download, Upload, RefreshCw, Search, X } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { type Employee } from "@/types/employee";
import EmployeeTable from "@/components/employees/EmployeeTable";
import EmptyState from "@/components/employees/EmptyState";
import AddEmployeeDrawer from "@/components/employees/AddEmployeeDrawer";
import EmployeeDetailsDrawer from "@/components/employees/EmployeeDrawer";
import FilterDropdown from "@/components/FilterDropdown";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listEmployees, listInvites, resendInvite, revokeInvite, listRoles, deleteEmployee, listGroups } from "@/lib/api";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export type Filters = {
    status: Employee["status"] | "";
    role: string;
    category: string;
    creator: string;
};


export default function EmployeesPage() {
    const { getToken, isAuthenticated, user } = useKindeAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [teams, setTeams] = useState<string[]>([]);

    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [search, setSearch] = useState<string>("");

    const [filters, setFilters] = useState<Filters>({
        status: "",
        role: "",
        category: "",
        creator: "",
    });

    const isEmpty = employees.length === 0;

    const fetchEmployees = useCallback(async () => {
        try {
            setIsLoading(true);
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

            const employeeList = empData?.employees || (Array.isArray(empData) ? empData : []);
            const inviteList = empData?.pending_invites || (Array.isArray(inviteData) ? inviteData : ((inviteData as any)?.invites || []));
            const rolesList = Array.isArray(rolesData) ? (rolesData as any) : [];
            const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData?.groups || []);
            const groupNames = groupsList.map((g: any) => g.name);
            setTeams(groupNames);

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

                return {
                    id: emp.id || `EMP-${Date.now()}`,
                    inviteId: emp.invite_id || emp.id,
                    name: fullName,
                    role: roleName,
                    category: emp.category || "-",
                    avatar: emp.avatar || "",
                    status: emp.status || (emp.is_active ? "online" : "offline"),
                    kbFiles: emp.kb_files !== undefined && emp.kb_files !== null ? emp.kb_files : "-",
                    simpleInteraction: emp.simple_interaction !== undefined && emp.simple_interaction !== null ? emp.simple_interaction : "-",
                    complexInteraction: emp.complex_interaction !== undefined && emp.complex_interaction !== null ? emp.complex_interaction : "-",
                    email: emp.email || "-",
                    createdBy: emp.created_by || emp.createdBy || "Admin",
                    createdDate: emp.created_at
                        ? new Date(emp.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                        : "-",
                    isActive: emp.is_active !== undefined ? !!emp.is_active : true,
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
                        email: inv.email || "-",
                        createdBy: "Admin",
                        createdDate: inv.invited_at || inv.created_at
                            ? new Date(inv.invited_at || inv.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                            : "-",
                        isActive: false,
                    };
                });

            // Prevent duplicate emails across active employees and pending invites
            const activeEmails = new Set(mappedEmployees.map(e => e.email.toLowerCase()));
            const uniqueInvites = mappedInvites.filter(inv => !activeEmails.has(inv.email.toLowerCase()));

            setEmployees([...mappedEmployees, ...uniqueInvites]);
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
            fetchEmployees();

            const handleUserChange = () => {
                console.log("User changed by another user - refreshing...");
                fetchEmployees();
            };

            cacheWebSocket.on("user:added", handleUserChange);
            cacheWebSocket.on("user:updated", handleUserChange);
            cacheWebSocket.on("user:removed", handleUserChange);

            return () => {
                cacheWebSocket.off("user:added", handleUserChange);
                cacheWebSocket.off("user:updated", handleUserChange);
                cacheWebSocket.off("user:removed", handleUserChange);
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

    const uniqueRoles = useMemo(() => {
        const list = new Set<string>();
        employees.forEach((emp) => {
            if (emp.role) list.add(emp.role);
        });
        return Array.from(list).sort();
    }, [employees]);

    const uniqueCategories = useMemo(() => {
        const list = new Set<string>();
        employees.forEach((emp) => {
            if (emp.category && emp.category !== "-") list.add(emp.category);
        });
        return Array.from(list).sort();
    }, [employees]);

    const uniqueCreators = useMemo(() => {
        const list = new Set<string>();
        employees.forEach((emp) => {
            if (emp.createdBy && emp.createdBy !== "-") list.add(emp.createdBy);
        });
        return Array.from(list).sort();
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        const query = search.toLowerCase();
        const { status, role, category, creator } = filters;

        return employees.filter((emp) => {
            // Filters (check first as they're faster)
            if (status && (emp.status || "").trim().toLowerCase() !== status.trim().toLowerCase()) return false;
            if (role && (emp.role || "").trim().toLowerCase() !== role.trim().toLowerCase()) return false;
            if (category && (emp.category || "").trim().toLowerCase() !== category.trim().toLowerCase()) return false;
            if (creator && (emp.createdBy || "").trim().toLowerCase() !== creator.trim().toLowerCase()) return false;

            // Search
            if (query) {
                const searchableText = `${emp.name} ${emp.id} ${emp.role} ${emp.category} ${emp.createdBy}`.toLowerCase();
                if (!searchableText.includes(query)) return false;
            }

            return true;
        });
    }, [employees, search, filters.status, filters.role, filters.category, filters.creator]);

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
        <div className="flex flex-col h-full overflow-hidden" data-testid="employees-page">
            <div className="px-4 sm:px-8 py-6 flex flex-col h-full overflow-y-auto" data-tour="employees-page">
                {/* Header - Fixed */}
                <div className="shrink-0 flex flex-col gap-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Employees
                            </h1>

                            {!isEmpty && (
                                <Badge className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                                    {employees.length}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="w-full sm:w-auto" onClick={fetchEmployees} disabled={isLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Manage your team members, their roles, access permissions, and track their activity.
                    </p>
                </div>

                {/* Actions - Fixed */}
                <div className="mt-6 shrink-0 flex flex-wrap gap-3">
                    <Button data-tour="add-employee-btn" variant="outline" className="flex-1 sm:flex-none" onClick={() => setDrawerOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>

                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50 cursor-not-allowed">
                                        <Download className="h-4 w-4" />
                                        Import
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                Coming soon
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50 cursor-not-allowed">
                                        <Upload className="h-4 w-4" />
                                        Export
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                Coming soon
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
                        className="h-10 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
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

                {/* Filters - Fixed */}
                <div data-tour="employee-filters" className="mt-4 shrink-0 flex flex-wrap gap-2">
                    <FilterDropdown
                        label="Status"
                        value={filters.status}
                        options={uniqueStatuses.length > 0 ? uniqueStatuses : ["Online", "Away", "Offline"]}
                        onChange={(v: any) =>
                            setFilters((f) => ({ ...f, status: v }))
                        }
                    />

                    <FilterDropdown
                        label="Role"
                        value={filters.role}
                        options={uniqueRoles.length > 0 ? uniqueRoles : ["Super Admin", "Admin", "Editor", "Member"]}
                        onChange={(v: string) =>
                            setFilters((f) => ({ ...f, role: v }))
                        }
                    />

                    <FilterDropdown
                        label="Team"
                        value={filters.category}
                        options={teams.length > 0 ? teams : (uniqueCategories.length > 0 ? uniqueCategories : ["Engineering", "Marketing", "Sales", "HR"])}
                        onChange={(v: string) =>
                            setFilters((f) => ({ ...f, category: v }))
                        }
                    />

                    <FilterDropdown
                        label="Creator"
                        value={filters.creator}
                        options={uniqueCreators.length > 0 ? uniqueCreators : ["Admin"]}
                        onChange={(v: string) =>
                            setFilters((f) => ({ ...f, creator: v }))
                        }
                    />
                </div>

                {/* Body - Pinned Layout */}
                <div className="mt-6 flex-1 flex flex-col min-h-0">
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
                        <div className="flex-1 flex flex-col pt-4">
                            <EmptyState onAddClick={() => setDrawerOpen(true)} />
                        </div>
                    ) : isNoResults ? (
                        <div className="flex-1 flex flex-col pt-4">
                            <div className="flex flex-1 min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30 px-6 py-8 text-center my-2">
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    No results found {search ? `for "${search}"` : "with current filters"}
                                </p>
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                    Try adjusting your filters or search terms.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <EmployeeTable
                            employees={filteredEmployees}
                            onDelete={handleDeleteEmployee}
                            onView={(emp) => {
                                setSelectedEmployee(emp);
                                setDetailDrawerOpen(true);
                            }}
                            onResendInvite={handleResendInvite}
                            onRevokeInvite={handleRevokeInvite}
                            currentUserEmail={user?.email ?? undefined}
                        />
                    )}
                </div>

                <AddEmployeeDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    onSubmit={handleAddEmployee}
                />

                <EmployeeDetailsDrawer
                    open={detailDrawerOpen}
                    onOpenChange={setDetailDrawerOpen}
                    employee={selectedEmployee}
                />
            </div>
        </div>
    );
}