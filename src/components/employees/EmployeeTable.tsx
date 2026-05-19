import { useMemo, useState, type JSX } from "react";

import {
    MoreVertical,
    Eye,
    Pencil,
    FolderPlus,
    RotateCw,
    Archive,
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

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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

import { type Employee, type EmployeeStatus } from "@/types/employee";

type StatusDotProps = {
    status: EmployeeStatus;
};

type RowMenuProps = {
    employee: Employee;
    onDelete: (id: string) => void;
    onView: (employee: Employee) => void;
    onResendInvite?: (id: string) => void;
    onRevokeInvite?: (id: string) => void;
    currentUserEmail?: string;
};

type EmployeeTableProps = {
    employees: Employee[];
    onDelete: (id: string) => void;
    onView: (employee: Employee) => void;
    onResendInvite?: (id: string) => void;
    onRevokeInvite?: (id: string) => void;
    currentUserEmail?: string;
};

function StatusDot({
    status,
}: StatusDotProps): JSX.Element {
    const color =
        status === "online"
            ? "bg-emerald-500"
            : status === "away"
                ? "bg-orange-500"
                : "bg-zinc-300";

    return (
        <span
            className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                color
            )}
        />
    );
}

function RowMenu({
    employee,
    onDelete,
    onView,
    onResendInvite,
    onRevokeInvite,
    currentUserEmail,
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
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Row actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-44"
            >
                <DropdownMenuItem
                    data-testid={`view-details-${employee.id}`}
                    onClick={() =>
                        onView(employee)
                    }
                >
                    <Eye className="mr-2 h-4 w-4 text-zinc-600" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() =>
                        toast(`Edit ${employee.name}`)
                    }
                >
                    <Pencil className="mr-2 h-4 w-4 text-zinc-600" />
                    Edit
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() =>
                        toast("Add to team")
                    }
                >
                    <FolderPlus className="mr-2 h-4 w-4 text-zinc-600" />
                    Add to Team
                </DropdownMenuItem>

                {employee.isActive === false && onResendInvite && (
                    <DropdownMenuItem
                        onClick={() =>
                            onResendInvite(employee.inviteId || employee.id)
                        }
                    >
                        <RotateCw className="mr-2 h-4 w-4 text-zinc-600" />
                        Resend Invite
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem
                    onClick={() =>
                        toast(`Archived ${employee.name}`)
                    }
                >
                    <Archive className="mr-2 h-4 w-4 text-zinc-600" />
                    Archive
                </DropdownMenuItem>

                {employee.isActive !== false ? (
                    canDelete && (
                        <DropdownMenuItem
                            data-testid={`delete-${employee.id}`}
                            onClick={() => onDelete(employee.id)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                        >
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            Delete
                        </DropdownMenuItem>
                    )
                ) : (
                    canDelete && onRevokeInvite && (
                        <DropdownMenuItem
                            onClick={() =>
                                onRevokeInvite(employee.inviteId || employee.id)
                            }
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                        >
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            Revoke Invite
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function EmployeeTable({
    employees,
    onDelete,
    onView,
    onResendInvite,
    onRevokeInvite,
    currentUserEmail,
}: EmployeeTableProps): JSX.Element {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const [rowsPerPage, setRowsPerPage] =
        useState<number>(50);

    const [page, setPage] =
        useState<number>(1);

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

    return (
        <div
            className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full"
            data-testid="employees-table"
        >
            <div className="w-full flex-1 flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="hidden md:grid grid-cols-[2.5fr_1.5fr_1.5fr_1.5fr_56px] items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/80 px-5 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 shrink-0 select-none">
                        <div className="text-sm normal-case tracking-normal text-zinc-600 cursor-pointer hover:text-zinc-900" onClick={() => handleSort("name")}>
                            Employee Name <SortIcon columnKey="name" />
                        </div>

                        <div className="text-sm normal-case tracking-normal text-zinc-600 cursor-pointer hover:text-zinc-900" onClick={() => handleSort("kbFiles")}>
                            No. Of KB Files <SortIcon columnKey="kbFiles" />
                        </div>

                        <div className="text-sm normal-case tracking-normal text-zinc-600 cursor-pointer hover:text-zinc-900" onClick={() => handleSort("simpleInteraction")}>
                            Simple Interaction <SortIcon columnKey="simpleInteraction" />
                        </div>

                        <div className="text-sm normal-case tracking-normal text-zinc-600 cursor-pointer hover:text-zinc-900" onClick={() => handleSort("complexInteraction")}>
                            Complex Interaction <SortIcon columnKey="complexInteraction" />
                        </div>

                        <div />
                    </div>

                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto hover-scrollbar min-h-0">
                        {pageRows.map((emp) => (
                            <div
                                key={emp.id}
                                onClick={() => onView(emp)}
                                className="flex flex-col md:grid md:grid-cols-[2.5fr_1.5fr_1.5fr_1.5fr_56px] items-start md:items-center gap-3 md:gap-2 border-b border-zinc-50 dark:border-zinc-800 px-5 py-4 transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 hover:shadow-2xs cursor-pointer group"
                                data-testid={`employee-row-${emp.id}`}
                            >

                                <div className="flex items-center gap-3 min-w-0 w-full md:w-auto flex-1">
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
                                                    <div className="text-sm font-medium text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                                                        {emp.name}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-xs">
                                                    {emp.name}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                                                        {emp.role}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs capitalize">
                                                    {emp.role}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <div className="md:hidden ml-auto">
                                        <RowMenu
                                            employee={emp}
                                            onDelete={(id) => setConfirmDeleteId(id)}
                                            onView={onView}
                                            onResendInvite={onResendInvite}
                                            onRevokeInvite={(id) => setConfirmRevokeId(id)}
                                            currentUserEmail={currentUserEmail}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 truncate">
                                    <span className="md:hidden text-zinc-500">No. Of KB Files:</span>
                                    {emp.kbFiles ?? "-"}
                                </div>

                                <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 truncate">
                                    <span className="md:hidden text-zinc-500">Simple Inter.:</span>
                                    {emp.simpleInteraction ?? "-"}
                                </div>

                                <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 truncate">
                                    <span className="md:hidden text-zinc-500">Complex Inter.:</span>
                                    {emp.complexInteraction ?? "-"}
                                </div>

                                <div className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
                                    <RowMenu
                                        employee={emp}
                                        onDelete={(id) => setConfirmDeleteId(id)}
                                        onView={onView}
                                        onResendInvite={onResendInvite}
                                        onRevokeInvite={(id) => setConfirmRevokeId(id)}
                                        currentUserEmail={currentUserEmail}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-6 px-5 py-3 text-sm text-zinc-600 dark:text-zinc-400 shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                    <span>Rows per Page</span>

                    <Select
                        value={String(rowsPerPage)}
                        onValueChange={(v: string) => {
                            setRowsPerPage(Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger
                            className="h-8 w-[72px] rounded-md border-zinc-200"
                            data-testid="rows-per-page-select"
                        >
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {[10, 25, 50, 100].map((n) => (
                                <SelectItem
                                    key={n}
                                    value={String(n)}
                                >
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div data-testid="pagination-range">
                    {total === 0
                        ? "0"
                        : `${startIdx + 1}-${endIdx}`}{" "}
                    of {total}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-40"
                        onClick={() =>
                            setPage((p) =>
                                Math.max(1, p - 1)
                            )
                        }
                        disabled={page === 1}
                        data-testid="prev-page-btn"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from(
                        {
                            length: Math.min(
                                totalPages,
                                4
                            ),
                        },
                        (_, i) => i + 1
                    ).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            data-testid={`page-${p}`}
                            className={cn(
                                "h-8 w-8 rounded-md text-sm",
                                page === p
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        type="button"
                        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-40"
                        onClick={() =>
                            setPage((p) =>
                                Math.min(
                                    totalPages,
                                    p + 1
                                )
                            )
                        }
                        disabled={
                            page === totalPages
                        }
                        data-testid="next-page-btn"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-200">
                        <span className="text-zinc-500 text-xs font-medium tracking-wide uppercase">Go to</span>
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={page}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    if (val >= 1 && val <= totalPages) {
                                        setPage(val);
                                        e.target.style.borderColor = "";
                                    } else {
                                        e.target.style.borderColor = "red";
                                        setTimeout(() => {
                                            setPage(Math.min(Math.max(1, val), totalPages));
                                            e.target.style.borderColor = "";
                                        }, 800);
                                    }
                                }
                            }}
                            className="h-8 w-14 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-center text-sm text-zinc-700 dark:text-zinc-200 font-medium focus:border-zinc-900 dark:focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                            aria-label="Go to page"
                        />
                    </div>
                </div>
            </div>

            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-100 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Delete Employee</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete this employee? This action cannot be undone and will permanently remove their access.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-lg">
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
                        <Button variant="outline" onClick={() => setConfirmRevokeId(null)} className="rounded-lg">
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