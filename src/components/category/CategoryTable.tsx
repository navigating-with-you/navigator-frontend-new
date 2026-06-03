import { useMemo, useState, type JSX } from "react";
import {
    MoreVertical,
    Eye,
    Pencil,
    UserPlus,
    Archive,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/utils/rbacConfig";
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
import { cn } from "@/lib/utils";
import { type Category } from "@/types/category";

type RowMenuProps = {
    category: Category;
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    onView: (category: Category) => void;
    onAddEmployees: (category: Category) => void;
    onArchive: (id: string) => void;
};

type CategoryTableProps = {
    categories: Category[];
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    onView: (category: Category) => void;
    onAddEmployees: (category: Category) => void;
    onArchive: (id: string) => void;
    visibleColumns?: string[];
    selected: Set<string>;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
};

function RowMenu({
    category,
    onDelete,
    onEdit,
    onView,
    onAddEmployees,
    onArchive,
}: RowMenuProps): JSX.Element {
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission(PERMISSIONS.GROUP_UPDATE);
    const canManageMembers = hasPermission(PERMISSIONS.GROUP_MANAGE_MEMBERS);
    const canDelete = hasPermission(PERMISSIONS.GROUP_DELETE);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    data-testid={`category-row-menu-${category.id}`}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                    aria-label="Team row actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-44 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
                <DropdownMenuItem
                    data-testid={`view-details-${category.id}`}
                    onClick={() => onView(category)}
                    className="cursor-pointer"
                >
                    <Eye className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    View Details
                </DropdownMenuItem>

                {canEdit && (
                    <DropdownMenuItem
                        data-testid={`edit-${category.id}`}
                        onClick={() => onEdit(category)}
                        className="cursor-pointer"
                    >
                        <Pencil className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Edit
                    </DropdownMenuItem>
                )}

                {canManageMembers && (
                    <DropdownMenuItem
                        data-testid={`add-employees-${category.id}`}
                        onClick={() => onAddEmployees(category)}
                        className="cursor-pointer"
                    >
                        <UserPlus className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        Add Employees
                    </DropdownMenuItem>
                )}

                {canEdit && (
                    <DropdownMenuItem
                        onClick={() => onArchive(category.id)}
                        className="cursor-pointer"
                    >
                        <Archive className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        {category.isArchived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                )}

                {canDelete && (
                    <DropdownMenuItem
                        data-testid={`delete-${category.id}`}
                        onClick={() => onDelete(category.id)}
                        className="text-red-650 focus:text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                        <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                        Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const COLUMN_WIDTHS: Record<string, string> = {
    name: "2.5fr",
    managerName: "2fr",
    kbCount: "1.8fr",
    employeeCount: "1.5fr",
    createdBy: "1.5fr",
    createdDate: "1.5fr",
};

export default function CategoryTable({
    categories,
    onDelete,
    onEdit,
    onView,
    onAddEmployees,
    onArchive,
    visibleColumns = ["name", "managerName", "kbCount", "employeeCount"],
    selected,
    setSelected,
}: CategoryTableProps): JSX.Element {
    const { hasPermission } = usePermissions();
    const canSelect = hasPermission(PERMISSIONS.GROUP_DELETE) || hasPermission(PERMISSIONS.GROUP_MANAGE_MEMBERS) || hasPermission(PERMISSIONS.GROUP_UPDATE);

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [page, setPage] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const computedGridCols = useMemo(() => {
        const cols = [];
        if (canSelect) {
            cols.push("48px"); // checkbox
        }
        visibleColumns.forEach((key: string) => {
            if (COLUMN_WIDTHS[key]) {
                cols.push(COLUMN_WIDTHS[key]);
            }
        });
        cols.push("56px"); // actions
        return cols.join(" ");
    }, [visibleColumns, canSelect]);

    const total = categories.length;

    const sortedCategories = useMemo(() => {
        if (!sortConfig) return categories;
        return [...categories].sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof Category];
            let bVal: any = b[sortConfig.key as keyof Category];
            if (aVal === undefined || aVal === null) aVal = "";
            if (bVal === undefined || bVal === null) bVal = "";
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
    }, [categories, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const startIdx = (page - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, total);

    const pageRows = useMemo(
        () => sortedCategories.slice(startIdx, endIdx),
        [sortedCategories, startIdx, endIdx]
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

    return (
        <div
            className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 flex flex-col h-full"
            data-testid="teams-table"
        >
            <div className="w-full flex-1 flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div
                        style={{ gridTemplateColumns: computedGridCols }}
                        className="hidden md:grid items-center gap-2 bg-[#60646B]/10 rounded-t-[10px] px-5 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 shrink-0 select-none"
                    >
                        {canSelect && (
                            <div>
                                <Checkbox
                                    checked={allChecked}
                                    onCheckedChange={toggleAll}
                                    data-testid="team-select-all"
                                />
                            </div>
                        )}
                        {visibleColumns.includes("name") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => handleSort("name")}>
                                Team Name <SortIcon columnKey="name" />
                            </div>
                        )}
                        {visibleColumns.includes("managerName") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => handleSort("managerName")}>
                                Manager <SortIcon columnKey="managerName" />
                            </div>
                        )}
                        {visibleColumns.includes("kbCount") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap" onClick={() => handleSort("kbCount")}>
                                No. Of Knowledge Base <SortIcon columnKey="kbCount" />
                            </div>
                        )}
                        {visibleColumns.includes("employeeCount") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap" onClick={() => handleSort("employeeCount")}>
                                No. Of Employees <SortIcon columnKey="employeeCount" />
                            </div>
                        )}
                        {visibleColumns.includes("createdBy") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap" onClick={() => handleSort("createdBy")}>
                                Created By <SortIcon columnKey="createdBy" />
                            </div>
                        )}
                        {visibleColumns.includes("createdDate") && (
                            <div className="text-sm normal-case tracking-normal text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap" onClick={() => handleSort("createdDate")}>
                                Created Date <SortIcon columnKey="createdDate" />
                            </div>
                        )}
                        <div />
                    </div>
 
                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto hover-scrollbar min-h-0">
                        {pageRows.map((cat) => (
                            <div
                                key={cat.id}
                                onClick={() => onView(cat)}
                                style={{ gridTemplateColumns: computedGridCols }}
                                className={cn(
                                    "flex flex-col md:grid items-start md:items-center gap-3 md:gap-2 px-5 py-4 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer group relative",
                                    cat.isArchived && "opacity-60 bg-zinc-50/30 dark:bg-zinc-900/30"
                                )}
                                data-testid={`team-row-${cat.id}`}
                            >
                                {canSelect ? (
                                    <div className="absolute top-5 right-5 md:static md:block" onClick={(e) => e.stopPropagation()}>
                                        <div className="hidden md:block">
                                            <Checkbox
                                                checked={selected.has(cat.id)}
                                                onCheckedChange={() => toggleOne(cat.id)}
                                                data-testid={`team-select-row-${cat.id}`}
                                            />
                                        </div>
                                        <div className="md:hidden">
                                            <RowMenu
                                                category={cat}
                                                onDelete={(id) => setConfirmDeleteId(id)}
                                                onEdit={onEdit}
                                                onView={onView}
                                                onAddEmployees={onAddEmployees}
                                                onArchive={onArchive}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute top-5 right-5 md:hidden" onClick={(e) => e.stopPropagation()}>
                                        <RowMenu
                                            category={cat}
                                            onDelete={(id) => setConfirmDeleteId(id)}
                                            onEdit={onEdit}
                                            onView={onView}
                                            onAddEmployees={onAddEmployees}
                                            onArchive={onArchive}
                                        />
                                    </div>
                                )}
 
                                {visibleColumns.includes("name") && (
                                    <div className="truncate min-w-0 w-full md:w-auto flex items-center gap-3">
                                        {canSelect && (
                                            <div className="md:hidden">
                                                <Checkbox
                                                    checked={selected.has(cat.id)}
                                                    onCheckedChange={() => toggleOne(cat.id)}
                                                    data-testid={`team-select-row-mobile-${cat.id}`}
                                                />
                                            </div>
                                        )}
                                        <div className="truncate">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 transition-colors">
                                                            {cat.name}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                        {cat.name}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {cat.isArchived && (
                                                <span className="inline-flex mt-1 text-[10px] font-bold text-zinc-505 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {visibleColumns.includes("managerName") && (
                                    <div className="flex justify-between w-full md:block md:w-auto md:min-w-0 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Manager:</span>
                                        {cat.managerName || "-"}
                                    </div>
                                )}

                                {visibleColumns.includes("kbCount") && (
                                    <div className="flex justify-between w-full md:block md:w-auto md:min-w-0 text-sm text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                                        <span className="md:hidden text-zinc-505 font-sans mr-2">No. Of Knowledge Base:</span>
                                        {cat.kbCount !== undefined ? String(cat.kbCount).padStart(2, "0") : "-"}
                                    </div>
                                )}

                                {visibleColumns.includes("employeeCount") && (
                                    <div className="flex justify-between w-full md:block md:w-auto md:min-w-0 text-sm text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                                        <span className="md:hidden text-zinc-505 font-sans mr-2">No. Of Employees:</span>
                                        {cat.employeeCount !== undefined ? String(cat.employeeCount).padStart(2, "0") : "-"}
                                    </div>
                                )}

                                {visibleColumns.includes("createdBy") && (
                                    <div className="flex justify-between w-full md:block md:w-auto md:min-w-0 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Created By:</span>
                                        {cat.createdBy || "-"}
                                    </div>
                                )}

                                {visibleColumns.includes("createdDate") && (
                                    <div className="flex justify-between w-full md:block md:w-auto md:min-w-0 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Created Date:</span>
                                        {cat.createdDate || "-"}
                                    </div>
                                )}

                                <div className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
                                    <RowMenu
                                        category={cat}
                                        onDelete={(id) => setConfirmDeleteId(id)}
                                        onEdit={onEdit}
                                        onView={onView}
                                        onAddEmployees={onAddEmployees}
                                        onArchive={onArchive}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-end gap-5 px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400 shrink-0 bg-white dark:bg-zinc-900 select-none">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">Rows per Page</span>
                    <Select
                        value={String(rowsPerPage)}
                        onValueChange={(v) => {
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
                                <SelectItem key={n} value={String(n)}>
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div data-testid="pagination-range" className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {total === 0 ? "0" : `${startIdx + 1}–${endIdx}`} of {total}
                </div>

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

                    {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map((p) => (
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

            {/* Confirm Delete Dialog */}
            <Dialog
                open={!!confirmDeleteId}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
            >
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">
                            Delete Team
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 leading-relaxed">
                            Are you sure you want to delete this team? This action cannot be undone and will un-link all employees and knowledge base materials currently associated with it.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg text-zinc-700 dark:text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4"
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
        </div>
    );
}
