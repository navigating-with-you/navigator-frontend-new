import { useMemo, useState, useEffect, type JSX } from "react";

import {
    MoreVertical,
    Eye,
    Pencil,
    FolderPlus,
    RotateCw,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar";

import { Checkbox } from "@/components/ui/checkbox";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listGroups, addGroupMembers } from "@/lib/api";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";

import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { type Employee, type EmployeeStatus } from "@/types/employee";

type StatusDotProps = {
    status: EmployeeStatus;
};

type RowMenuProps = {
    employee: Employee;
    onDelete: (id: string) => void;
    onView: (employee: Employee) => void;
    onEdit?: (employee: Employee) => void;
    onResendInvite?: (id: string) => void;
    onRevokeInvite?: (id: string) => void;
    currentUserEmail?: string;
    onAddToTeam?: (employee: Employee) => void;
};

type EmployeeTableProps = {
    employees: Employee[];
    onDelete: (id: string) => void;
    onView: (employee: Employee) => void;
    onEdit?: (employee: Employee) => void;
    onResendInvite?: (id: string) => void;
    onRevokeInvite?: (id: string) => void;
    currentUserEmail?: string;
    selected: Set<string>;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
    visibleColumns?: string[];
};

function StatusDot({
    status,
}: StatusDotProps): JSX.Element {
    const isPending = status?.toLowerCase() === "pending";
    const color = isPending
        ? "bg-[#FF5100]"
        : "bg-[#149614]";

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 cursor-pointer",
                            color
                        )}
                    />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {isPending ? "Pending" : "Accepted"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function RowMenu({
    employee,
    onDelete,
    onView,
    onEdit,
    onResendInvite,
    onRevokeInvite,
    currentUserEmail,
    onAddToTeam,
}: RowMenuProps): JSX.Element {
    // Delete is hidden if: target is Super Admin, OR target is the current user
    const isSelf = currentUserEmail && employee.email === currentUserEmail;
    const isTargetSuperAdmin = employee.role === "Super Admin";
    const canDelete = !isSelf && !isTargetSuperAdmin;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    data-testid={`row-menu-${employee.id}`}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                    aria-label="Row actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-44 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
                <DropdownMenuItem
                    data-testid={`view-details-${employee.id}`}
                    onClick={() =>
                        onView(employee)
                    }
                    className="cursor-pointer"
                >
                    <Eye className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    View Details
                </DropdownMenuItem>

                <PermissionGate permission={PERMISSIONS.EMPLOYEE_EDIT} fallback={
                    <div className="cursor-not-allowed opacity-60">
                        <Pencil className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Edit
                    </div>
                }>
                    <DropdownMenuItem
                        onClick={() => onEdit?.(employee)}
                        className="cursor-pointer"
                    >
                        <Pencil className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Edit
                    </DropdownMenuItem>
                </PermissionGate>


                <PermissionGate
                    permission={PERMISSIONS.GROUP_MANAGE_MEMBERS}
                    fallback={
                        <DropdownMenuItem onClick={() => toast("You don't have permission to add to team")} className="cursor-pointer flex items-center">
                            <FolderPlus className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            Add to Team
                        </DropdownMenuItem>
                    }
                >
                    <DropdownMenuItem onClick={() => onAddToTeam?.(employee)} className="cursor-pointer flex items-center">
                        <FolderPlus className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Add to Team
                    </DropdownMenuItem>
                </PermissionGate>

                {employee.isActive === false && onResendInvite && (
                    <DropdownMenuItem
                        onClick={() =>
                            onResendInvite(employee.inviteId || employee.id)
                        }
                        className="cursor-pointer"
                    >
                        <RotateCw className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Resend Invite
                    </DropdownMenuItem>
                )}

                {/* Archive action removed */}

                {employee.isActive !== false ? (
                    canDelete && (
                        <PermissionGate permission={PERMISSIONS.EMPLOYEE_DELETE} fallback={
                            <div className="text-red-600 opacity-60">
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                Delete
                            </div>
                        }>
                            <DropdownMenuItem
                                data-testid={`delete-${employee.id}`}
                                onClick={() => onDelete(employee.id)}
                                className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30"
                            >
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                Delete
                            </DropdownMenuItem>
                        </PermissionGate>
                    )
                ) : (
                    canDelete && onRevokeInvite && (
                        <PermissionGate permission={PERMISSIONS.EMPLOYEE_DELETE} fallback={
                            <div className="text-red-600 opacity-60">
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                Revoke Invite
                            </div>
                        }>
                            <DropdownMenuItem
                                onClick={() =>
                                    onRevokeInvite(employee.inviteId || employee.id)
                                }
                                className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30"
                            >
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                Revoke Invite
                            </DropdownMenuItem>
                        </PermissionGate>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const COLUMN_WIDTHS: Record<string, string> = {
    name: "2fr",
    status: "1.2fr",
    employeeCode: "1.2fr",
    kbFiles: "1fr",
    simpleInteraction: "1.2fr",
    complexInteraction: "1.2fr",
    id: "1.2fr",
    email: "1.5fr",
    role: "1.2fr",
    category: "1.2fr",
    createdBy: "1.2fr",
    createdDate: "1.2fr",
};

export default function EmployeeTable({
    employees,
    onDelete,
    onView,
    onEdit,
    onResendInvite,
    onRevokeInvite,
    currentUserEmail,
    selected,
    setSelected,
    visibleColumns = ["name", "status", "role", "kbFiles"],
}: EmployeeTableProps): JSX.Element {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Teams picker state
    const { getToken } = useKindeAuth();
    const [groups, setGroups] = useState<any[]>([]);
    const [teamPickerOpen, setTeamPickerOpen] = useState(false);
    const [teamTarget, setTeamTarget] = useState<Employee | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [isAddingToTeam, setIsAddingToTeam] = useState(false);

    useEffect(() => {
        if (!teamPickerOpen) return;
        let mounted = true;
        (async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const data = await listGroups(token).catch(() => []);
                if (!mounted) return;
                setGroups(Array.isArray(data) ? data : (data?.items || data?.groups || []));
            } catch (err) {
                console.error("Failed to load groups", err);
            }
        })();
        return () => { mounted = false; };
    }, [teamPickerOpen]);

    const [rowsPerPage, setRowsPerPage] =
        useState<number>(50);

    const [page, setPage] =
        useState<number>(1);

    const computedGridCols = useMemo(() => {
        const cols = ["48px"]; // checkbox
        visibleColumns.forEach((key: string) => {
            if (COLUMN_WIDTHS[key]) {
                cols.push(COLUMN_WIDTHS[key]);
            }
        });
        cols.push("56px"); // actions
        return cols.join(" ");
    }, [visibleColumns]);

    const total = employees.length;

    const sortedEmployees = useMemo(() => {
        if (!sortConfig) return employees;
        return [...employees].sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof Employee];
            let bVal: any = b[sortConfig.key as keyof Employee];
            if (aVal === "-" || aVal === undefined) aVal = "";
            if (bVal === "-" || bVal === undefined) bVal = "";
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
            }
            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortConfig.direction === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return 0;
        });
    }, [employees, sortConfig]);

    const totalPages = Math.max(
        1,
        Math.ceil(total / rowsPerPage)
    );

    const startIdx = (page - 1) * rowsPerPage;

    const endIdx = Math.min(
        startIdx + rowsPerPage,
        total
    );

    const pageRows = useMemo(
        () => sortedEmployees.slice(startIdx, endIdx),
        [sortedEmployees, startIdx, endIdx]
    );

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
        if (sortConfig.direction === "asc") return <ArrowUp className="ml-1 h-3 w-3 inline" />;
        return <ArrowDown className="ml-1 h-3 w-3 inline" />;
    };

    const toggleAll = (checked: boolean | "indeterminate"): void => {
        if (checked) {
            setSelected(new Set(pageRows.map((r) => r.id)));
        } else {
            setSelected(new Set());
        }
    };

    const toggleOne = (id: string): void => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const allChecked =
        pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

    const confirmDeleteEmployee = confirmDeleteId ? employees.find(e => e.id === confirmDeleteId) : null;

    return (
        <div
            className="rounded-2xl bg-white dark:bg-zinc-900 flex flex-col h-full overflow-hidden"
            data-testid="employees-table"
        >
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-x-auto hover-scrollbar">
                <div className="w-full flex-1 flex flex-col min-h-0 min-w-max md:min-w-full">
                    {/* Header */}
                    <div
                        style={{ gridTemplateColumns: computedGridCols }}
                        className="hidden md:grid items-center gap-0 bg-[#E7E7E0] rounded-t-[10px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300 shrink-0 select-none border-b border-zinc-200 dark:border-zinc-800"
                    >
                        <div className="pl-1">
                            <Checkbox
                                checked={allChecked}
                                onCheckedChange={toggleAll}
                                data-testid="employee-select-all"
                            />
                        </div>
                        {visibleColumns.includes("name") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("name")}>
                                Employee Name <SortIcon columnKey="name" />
                            </div>
                        )}

                        {visibleColumns.includes("status") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("status")}>
                                Status <SortIcon columnKey="status" />
                            </div>
                        )}

                        {visibleColumns.includes("employeeCode") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("employeeCode")}>
                                Employee Code <SortIcon columnKey="employeeCode" />
                            </div>
                        )}

                        {visibleColumns.includes("kbFiles") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("kbFiles")}>
                                No. Of KB Files <SortIcon columnKey="kbFiles" />
                            </div>
                        )}

                        {visibleColumns.includes("simpleInteraction") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("simpleInteraction")}>
                                Simple Interaction <SortIcon columnKey="simpleInteraction" />
                            </div>
                        )}

                        {visibleColumns.includes("complexInteraction") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("complexInteraction")}>
                                Complex Interaction <SortIcon columnKey="complexInteraction" />
                            </div>
                        )}

                        {visibleColumns.includes("id") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("id")}>
                                Employee ID <SortIcon columnKey="id" />
                            </div>
                        )}

                        {visibleColumns.includes("email") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("email")}>
                                Email <SortIcon columnKey="email" />
                            </div>
                        )}

                        {visibleColumns.includes("role") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("role")}>
                                Role <SortIcon columnKey="role" />
                            </div>
                        )}

                        {visibleColumns.includes("category") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("category")}>
                                Categories <SortIcon columnKey="category" />
                            </div>
                        )}

                        {visibleColumns.includes("createdBy") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("createdBy")}>
                                Created By <SortIcon columnKey="createdBy" />
                            </div>
                        )}

                        {visibleColumns.includes("createdDate") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 px-3" onClick={() => handleSort("createdDate")}>
                                Created Date <SortIcon columnKey="createdDate" />
                            </div>
                        )}

                        <div className="px-2" />
                    </div>

                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto hover-scrollbar min-h-0">
                        {pageRows.map((emp) => (
                            <div
                                key={emp.id}
                                onClick={() => onView(emp)}
                                style={{ gridTemplateColumns: computedGridCols }}
                                className="flex flex-col md:grid items-start md:items-center gap-3 md:gap-0 px-5 py-4 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer group relative border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0"
                                data-testid={`employee-row-${emp.id}`}
                            >
                                <div className="absolute top-5 right-5 md:static md:block px-2 md:px-0" onClick={(e) => e.stopPropagation()}>
                                    <div className="hidden md:block">
                                        <Checkbox
                                            checked={selected.has(emp.id)}
                                            onCheckedChange={() => toggleOne(emp.id)}
                                            data-testid={`employee-select-row-${emp.id}`}
                                        />
                                    </div>
                                    <div className="md:hidden">
                                        <RowMenu
                                            employee={emp}
                                            onDelete={(id) => setConfirmDeleteId(id)}
                                            onView={onView}
                                            onEdit={onEdit}
                                            onResendInvite={onResendInvite}
                                            onRevokeInvite={(id) => setConfirmRevokeId(id)}
                                            currentUserEmail={currentUserEmail}
                                            onAddToTeam={(e) => { setTeamTarget(e); setTeamPickerOpen(true); setSelectedGroup(""); }}
                                        />
                                    </div>
                                </div>

                                {visibleColumns.includes("name") && (
                                    <div className="flex items-center gap-3 min-w-0 w-full md:w-auto flex-1 px-3">
                                        <div className="md:hidden">
                                            <Checkbox
                                                checked={selected.has(emp.id)}
                                                onCheckedChange={() => toggleOne(emp.id)}
                                                data-testid={`employee-select-row-mobile-${emp.id}`}
                                            />
                                        </div>
                                        <div className="relative shrink-0">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage
                                                    src={emp.avatar}
                                                    alt={emp.name}
                                                />

                                                <AvatarFallback>
                                                    {emp.name
                                                        ? emp.name
                                                            .split(" ")
                                                            .filter(Boolean)
                                                            .map((n: string) => n[0])
                                                            .join("")
                                                            .slice(0, 2)
                                                        : "EMP"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <StatusDot status={emp.status} />
                                        </div>

                                        <div className="truncate min-w-0 flex-1">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 transition-colors">
                                                            {emp.name}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        {emp.name}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {!visibleColumns.includes("role") && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="text-xs text-zinc-505 dark:text-zinc-400 truncate mt-0.5">
                                                                {emp.role}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="text-xs capitalize">
                                                            {emp.role}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {visibleColumns.includes("status") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Status:</span>
                                        {emp.isActive !== false ? (
                                            <Badge variant="outline" className="bg-[#149614]/10 text-[#149614] border-[#149614]/20 dark:bg-[#149614]/10 dark:text-[#149614] dark:border-[#149614]/30 font-medium">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-[#FF5100]/10 text-[#FF5100] border-[#FF5100]/20 dark:bg-[#FF5100]/10 dark:text-[#FF5100] dark:border-[#FF5100]/30 font-medium">
                                                Pending Invite
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {visibleColumns.includes("employeeCode") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Employee Code:</span>
                                        <span className="truncate">{emp.employeeCode || "-"}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("kbFiles") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">KB Files:</span>
                                        <span className="truncate">{emp.kbFiles ?? "-"}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("simpleInteraction") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Simple Interaction:</span>
                                        <span className="truncate">{emp.simpleInteraction ?? "-"}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("complexInteraction") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Complex Interaction:</span>
                                        <span className="truncate">{emp.complexInteraction ?? "-"}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("id") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Employee ID:</span>
                                        <span className="truncate">{emp.id}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("email") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Email:</span>
                                        <span className="truncate">{emp.email}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("role") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Role:</span>
                                        <span className="truncate">{emp.role}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("category") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Categories:</span>
                                        <span className="truncate">{emp.category}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("createdBy") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Created By:</span>
                                        <span className="truncate">{emp.createdBy}</span>
                                    </div>
                                )}

                                {visibleColumns.includes("createdDate") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate px-3">
                                        <span className="md:hidden text-zinc-500 font-medium min-w-fit pr-2">Created Date:</span>
                                        <span className="truncate">{emp.createdDate}</span>
                                    </div>
                                )}

                                <div className="hidden md:flex justify-end px-2" onClick={(e) => e.stopPropagation()}>
                                    <RowMenu
                                        employee={emp}
                                        onDelete={(id) => setConfirmDeleteId(id)}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onResendInvite={onResendInvite}
                                        onRevokeInvite={(id) => setConfirmRevokeId(id)}
                                        currentUserEmail={currentUserEmail}
                                        onAddToTeam={(e) => { setTeamTarget(e); setTeamPickerOpen(true); setSelectedGroup(""); }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team picker dialog */}
            <Dialog open={teamPickerOpen} onOpenChange={(open) => !open && setTeamPickerOpen(false)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-100 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Add to Team</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Select a team to add {teamTarget?.name} to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium w-full">
                                <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                        {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setTeamPickerOpen(false)} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!selectedGroup || !teamTarget) return;
                                setIsAddingToTeam(true);
                                try {
                                    const token = await getToken();
                                    if (!token) throw new Error("Not authenticated");
                                    await addGroupMembers(selectedGroup, [teamTarget.id], token);
                                    toast.success(`${teamTarget.name} added to team`);
                                    setTeamPickerOpen(false);
                                } catch (err: any) {
                                    console.error("Add to team error", err);
                                    toast.error(err?.message || "Failed to add to team");
                                } finally {
                                    setIsAddingToTeam(false);
                                }
                            }}
                            disabled={isAddingToTeam || !selectedGroup}
                            className="rounded-lg h-10 px-4 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            {isAddingToTeam ? "Adding..." : "Add to Team"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-5 px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400 shrink-0 bg-white dark:bg-zinc-900 select-none">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">Rows per Page</span>
                    <Select
                        value={String(rowsPerPage)}
                        onValueChange={(v: string) => {
                            setRowsPerPage(Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger
                            className="h-8 w-[72px] rounded-lg border-0 bg-[#E7E7E0]/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium shadow-none focus:ring-0"
                            data-testid="rows-per-page-select"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                            {[10, 25, 50, 100].map((n) => (
                                <SelectItem
                                    key={n}
                                    value={String(n)}
                                    className="dark:text-zinc-200 dark:focus:bg-zinc-700"
                                >
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Range */}
                <div data-testid="pagination-range" className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {total === 0 ? "0" : `${startIdx + 1}–${endIdx}`} of {total}
                </div>

                {/* Page buttons */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 transition-colors"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="prev-page-btn"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from(
                        { length: Math.min(totalPages, 4) },
                        (_, i) => i + 1
                    ).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            data-testid={`page-${p}`}
                            className={cn(
                                "h-8 w-8 rounded-full text-sm font-medium transition-all",
                                page === p
                                    ? "bg-[#E7E7E0] dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                                    : "text-zinc-500 dark:text-zinc-400 hover:bg-[#E7E7E0]/60 dark:hover:bg-zinc-800"
                            )}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 transition-colors"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        data-testid="next-page-btn"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-100 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Delete {confirmDeleteEmployee?.name || "Employee"}</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete {confirmDeleteEmployee?.name || "this employee"}? This action cannot be undone and will permanently remove their access.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            onClick={() => {
                                if (confirmDeleteId) {
                                    onDelete(confirmDeleteId);
                                    setConfirmDeleteId(null);
                                }
                            }}
                        >
                            Confirm Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmRevokeId} onOpenChange={(open) => !open && setConfirmRevokeId(null)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-100 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Revoke Invitation</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to revoke this pending invitation? The user will no longer be able to use the invite link to sign up.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setConfirmRevokeId(null)} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            onClick={() => {
                                if (confirmRevokeId && onRevokeInvite) {
                                    onRevokeInvite(confirmRevokeId);
                                    setConfirmRevokeId(null);
                                }
                            }}
                        >
                            Confirm Revoke
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}