import { useMemo, useState } from "react";
import {
    FolderClosed,
    FileText,
    MoreVertical,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Info,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RefreshCw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KBEntry } from "@/types/knowledge-base";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";

interface KnowledgeBaseTableProps {
    entries: KBEntry[];
    onDelete: (id: string) => void;
    onView: (entry: KBEntry) => void;
    onViewFolderDetails?: (entry: KBEntry) => void;
    isInsideFolder?: boolean;
    visibleColumns?: string[];
    selected: Set<string>;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
    onRetryOcr?: (id: string) => void;
}

function TypeIcon({ type }: { type: KBEntry["type"] }) {
    if (type === "folder")
        return <FolderClosed className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />;
}

function OcrStatusBadge({ status }: { status?: string | null }) {
    if (!status) return null;

    const cfg: Record<string, { icon: React.ReactNode; label: string; cls: string; desc: string }> = {
        pending: {
            icon: <Clock className="h-3 w-3" />,
            label: "Processing",
            cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
            desc: "File is in queue waiting to be processed by the OCR engine.",
        },
        processing: {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            label: "Processing",
            cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            desc: "Gemini is currently reading the document, extracting text, and generating vector embeddings.",
        },
        completed: {
            icon: <CheckCircle2 className="h-3 w-3" />,
            label: "Indexed",
            cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            desc: "OCR processing is complete. The document text is extracted, indexed, and ready for search.",
        },
        failed: {
            icon: <XCircle className="h-3 w-3" />,
            label: "Failed",
            cls: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
            desc: "OCR processing failed. The document text could not be read or extracted.",
        },
        cancelled: {
            icon: <XCircle className="h-3 w-3" />,
            label: "Cancelled",
            cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
            desc: "OCR processing was cancelled.",
        },
    };

    const c = cfg[status];
    if (!c) return null;

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", c.cls)} title={c.desc}>
            {c.icon}
            {c.label}
        </span>
    );
}

const COLUMN_WIDTHS: Record<string, string> = {
    name: "2fr",
    type: "0.8fr",
    folder: "1fr",
    owner: "1fr",
    createdDate: "1.2fr",
    ocr_status: "1fr",
};

export default function KnowledgeBaseTable({
    entries,
    onDelete,
    onView,
    onViewFolderDetails,
    onRetryOcr,
    isInsideFolder = false,
    visibleColumns = ["name", "folder", "owner"],
    selected,
    setSelected,
}: KnowledgeBaseTableProps) {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const computedGridCols = useMemo(() => {
        const cols = ["48px"]; // Prepend checkbox space
        visibleColumns.forEach((key: string) => {
            if (COLUMN_WIDTHS[key]) {
                cols.push(COLUMN_WIDTHS[key]);
            }
        });
        cols.push("56px"); // actions
        return cols.join(" ");
    }, [visibleColumns]);

    const total = entries.length;

    const sortedEntries = useMemo(() => {
        if (!sortConfig) return entries;
        return [...entries].sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof KBEntry];
            let bVal: any = b[sortConfig.key as keyof KBEntry];
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
    }, [entries, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const startIdx = (page - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, total);
    const pageRows = useMemo(() => sortedEntries.slice(startIdx, endIdx), [sortedEntries, startIdx, endIdx]);

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

    // Column header labels swap based on context
    const col2Label = isInsideFolder ? "Size / Description" : "Description";
    const col3Label = "Creator";

    return (
        <div
            className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 flex flex-col h-full"
            data-testid="kb-table"
        >
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-x-auto">
                <div className="w-full flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div
                        style={{ gridTemplateColumns: computedGridCols }}
                        className="hidden md:grid items-center gap-2 bg-[#E7E7E0] dark:bg-[#171717] rounded-t-[10px] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#171717] dark:text-[#E7E7E0] shrink-0 select-none md:min-w-[800px] lg:min-w-full"
                    >
                        <div>
                            <Checkbox
                                checked={allChecked}
                                onCheckedChange={toggleAll}
                                data-testid="kb-select-all"
                            />
                        </div>
                        {visibleColumns.includes("name") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("name")}>
                                Knowledge Base Name <SortIcon columnKey="name" />
                            </div>
                        )}
                        {visibleColumns.includes("type") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("type")}>
                                Type <SortIcon columnKey="type" />
                            </div>
                        )}
                        {visibleColumns.includes("folder") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("folder")}>
                                {col2Label} <SortIcon columnKey="folder" />
                            </div>
                        )}
                        {visibleColumns.includes("owner") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("owner")}>
                                {col3Label} <SortIcon columnKey="owner" />
                            </div>
                        )}
                        {visibleColumns.includes("createdDate") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("createdDate")}>
                                Created Date <SortIcon columnKey="createdDate" />
                            </div>
                        )}
                        {visibleColumns.includes("ocr_status") && (
                            <div className="text-sm normal-case tracking-normal text-[#171717] dark:text-[#E7E7E0] font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort("ocr_status")} title="Status of document text extraction and indexing. Hover over status badges to see detailed descriptions.">
                                Status <SortIcon columnKey="ocr_status" />
                            </div>
                        )}
                        <div />
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto hover-scrollbar min-h-0 md:min-w-[800px] lg:min-w-full">
                        {pageRows.map((kb) => (
                            <div
                                key={kb.id}
                                data-testid={`kb-row-${kb.id}`}
                                onClick={() => onView(kb)}
                                style={{ gridTemplateColumns: computedGridCols }}
                                className="flex flex-col md:grid items-start md:items-center gap-3 md:gap-2 px-5 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer relative border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0"
                            >
                                {/* Checkbox Column Desktop */}
                                <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selected.has(kb.id)}
                                        onCheckedChange={() => toggleOne(kb.id)}
                                        data-testid={`kb-select-row-${kb.id}`}
                                    />
                                </div>

                                {/* Actions on Mobile */}
                                <div className="absolute top-5 right-5 md:hidden" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                data-testid={`kb-row-menu-${kb.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                                                aria-label="Row actions"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end" className="w-44 dark:bg-zinc-900 dark:border-zinc-800">
                                            <DropdownMenuItem
                                                className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onView(kb);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                                {kb.type === "folder" ? "Open Folder" : "View Details"}
                                            </DropdownMenuItem>

                                            {kb.type === "folder" && onViewFolderDetails && (
                                                <DropdownMenuItem
                                                    className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewFolderDetails(kb);
                                                    }}
                                                >
                                                    <Info className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                                    Folder Details
                                                </DropdownMenuItem>
                                            )}

                                            {kb.type === "file" && kb.ocr_status === "failed" && onRetryOcr && (
                                                <DropdownMenuItem
                                                    className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRetryOcr(kb.id);
                                                    }}
                                                >
                                                    <RefreshCw className="h-4 w-4 text-zinc-650 dark:text-zinc-400" />
                                                    Retry OCR
                                                </DropdownMenuItem>
                                            )}

                                            <PermissionGate
                                                permissions={[PERMISSIONS.FILE_DELETE, PERMISSIONS.FOLDER_DELETE]}
                                                requireAll={false}
                                                fallback={null}
                                            >
                                                <DropdownMenuItem
                                                    className="text-red-655 focus:text-red-655 cursor-pointer dark:focus:bg-zinc-800"
                                                    data-testid={`kb-delete-${kb.id}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteId(kb.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-655" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </PermissionGate>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Col 1: Icon + Name */}
                                {visibleColumns.includes("name") && (
                                    <div className="flex items-center gap-3 min-w-0 w-full md:w-auto flex-1 pr-12 md:pr-0">
                                        <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selected.has(kb.id)}
                                                onCheckedChange={() => toggleOne(kb.id)}
                                                data-testid={`kb-select-row-mobile-${kb.id}`}
                                            />
                                        </div>
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                            <TypeIcon type={kb.type} />
                                        </div>
                                        <div className="truncate">
                                            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {kb.name}
                                            </div>
                                            {!visibleColumns.includes("createdDate") && (
                                                <div className="text-xs text-zinc-505 dark:text-zinc-400 truncate">
                                                    {kb.createdDate}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Col: Type */}
                                {visibleColumns.includes("type") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Type:</span>
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300">
                                            {kb.type}
                                        </span>
                                    </div>
                                )}

                                {/* Col 2: Size / Description */}
                                {visibleColumns.includes("folder") && (
                                    <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-2 truncate">
                                        <span className="md:hidden text-sm text-zinc-505 font-medium">{col2Label}:</span>
                                        {kb.type === "file" ? (
                                            <div className="flex items-center md:flex-col md:items-start gap-2 md:gap-0.5">
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                                    {kb.folder}
                                                </span>
                                                {!visibleColumns.includes("ocr_status") && (
                                                    <OcrStatusBadge status={kb.ocr_status} />
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-zinc-505 dark:text-zinc-400 truncate italic">
                                                {kb.description || kb.folder || <span className="not-italic">—</span>}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Col 3: Creator */}
                                {visibleColumns.includes("owner") && (
                                    <div className="flex w-full md:w-auto justify-between md:justify-start text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium">{col3Label}:</span>
                                        {kb.owner}
                                    </div>
                                )}

                                {/* Col: Created Date */}
                                {visibleColumns.includes("createdDate") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Created Date:</span>
                                        {kb.createdDate}
                                    </div>
                                )}

                                {/* Col: Status */}
                                {visibleColumns.includes("ocr_status") && (
                                    <div className="flex justify-between w-full md:w-auto text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                        <span className="md:hidden text-zinc-505 font-medium mr-2">Status:</span>
                                        {kb.ocr_status ? <OcrStatusBadge status={kb.ocr_status} /> : <span className="text-zinc-505 dark:text-zinc-500">—</span>}
                                    </div>
                                )}

                                {/* Col 4: Actions Desktop */}
                                <div className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                data-testid={`kb-row-menu-${kb.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                                                aria-label="Row actions"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end" className="w-44 dark:bg-zinc-900 dark:border-zinc-800">
                                            <DropdownMenuItem
                                                className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onView(kb);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                                {kb.type === "folder" ? "Open Folder" : "View Details"}
                                            </DropdownMenuItem>

                                            {kb.type === "folder" && onViewFolderDetails && (
                                                <DropdownMenuItem
                                                    className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewFolderDetails(kb);
                                                    }}
                                                >
                                                    <Info className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                                    Folder Details
                                                </DropdownMenuItem>
                                            )}

                                            {kb.type === "file" && kb.ocr_status === "failed" && onRetryOcr && (
                                                <DropdownMenuItem
                                                    className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRetryOcr(kb.id);
                                                    }}
                                                >
                                                    <RefreshCw className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                                    Retry OCR
                                                </DropdownMenuItem>
                                            )}

                                            <PermissionGate
                                                permissions={[PERMISSIONS.FILE_DELETE, PERMISSIONS.FOLDER_DELETE]}
                                                requireAll={false}
                                                fallback={null}
                                            >
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 cursor-pointer dark:focus:bg-zinc-800"
                                                    data-testid={`kb-delete-${kb.id}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteId(kb.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </PermissionGate>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-end gap-5 px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400 shrink-0 bg-white dark:bg-zinc-900 select-none">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">Rows per Page</span>
                    <Select
                        value={String(rowsPerPage)}
                        onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(1); }}
                    >
                        <SelectTrigger
                            className="h-8 w-[72px] rounded-lg border-0 bg-[#E7E7E0]/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium shadow-none focus:ring-0"
                            data-testid="kb-rows-per-page-select"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                            {[10, 25, 50, 100].map((n) => (
                                <SelectItem key={n} value={String(n)} className="dark:text-zinc-200 dark:focus:bg-zinc-800">
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div data-testid="kb-pagination-range" className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {total === 0 ? "0" : `${startIdx + 1}–${endIdx}`} of {total}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 transition-colors"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="kb-prev-page-btn"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            data-testid={`kb-page-${p}`}
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
                        data-testid="kb-next-page-btn"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-100 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">
                            Delete {confirmDeleteId && entries.find(e => e.id === confirmDeleteId)?.type === "folder" ? "Folder" : "Document"}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete this item? This action cannot be undone and will permanently remove it from the knowledge base.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg dark:border-zinc-700 dark:text-zinc-300"
                        >
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
        </div>
    );
}