import { useMemo, useState, useEffect, useCallback } from "react";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { PageActionButton } from "@/components/ui/page-action-button";
import {
    FolderPlus,
    FilePlus2,
    Type,
    Globe,
    RefreshCw,
    Search,
    X,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import FilterDropdown from "@/components/FilterDropdown";
import KnowledgeBaseEmptyState from "@/components/knowledge-base/KnowledgeBaseEmptyState";
import KnowledgeBaseTable from "@/components/knowledge-base/KnowledgeBaseTable";
import ColumnSettings from "@/components/ui/ColumnSettings";

const KB_COLUMNS = [
    { key: "name", label: "Knowledge Base Name" },
    { key: "type", label: "Type" },
    { key: "folder", label: "Size / Description" },
    { key: "owner", label: "Creator" },
    { key: "createdDate", label: "Created Date" },
    { key: "ocr_status", label: "OCR Status" },
];

const DEFAULT_KB_COLUMNS = ["name", "folder", "owner"];
import CreateFolderDrawer from "@/components/knowledge-base/CreateFolderDrawer";
import AddFilesDrawer from "@/components/knowledge-base/AddFilesDrawer";
import AddTextDrawer from "@/components/knowledge-base/AddTextDrawer";
import AddUrlDrawer from "@/components/knowledge-base/AddUrlDrawer";

import KnowledgeBaseDetailDrawer from "@/components/knowledge-base/KnowledgeBaseDetailDrawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import {
    getRootContents,
    getFolderContents,
    createFolder,
    deleteFolder,
    uploadFiles,
    deleteFiles,
    listEmployees,
} from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import type {
    KBEntry,
    CreateFolderPayload,
    AddTextPayload,
    AddUrlPayload,
} from "@/types/knowledge-base";

/** ---------------- Helpers ---------------- */

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function rawFolderToEntry(f: any): KBEntry {
    const size = f.total_size !== undefined ? formatSize(f.total_size) : "0 B";
    return {
        id: f.id,
        name: f.name,
        type: "folder",
        folder: f.description || "",
        owner: f.creator?.display_name || f.creator?.email || "Unknown",
        createdDate: f.created_at ? `${formatDate(f.created_at)} • ${size}` : "-",
        description: f.description,
    };
}

function rawFileToEntry(file: any, ocrStatusMap?: Record<string, string>): KBEntry {
    return {
        id: file.id,
        name: file.original_filename || file.name,
        type: "file",
        folder: formatSize(file.file_size || 0),
        owner: file.uploader?.display_name || file.uploader?.email || "Unknown",
        createdDate: file.created_at ? formatDate(file.created_at) : "-",
        file_size: file.file_size,
        mime_type: file.mime_type,
        ocr_status: (ocrStatusMap?.[file.id] as any) ?? null,
        description: file.description,
    };
}

/** A breadcrumb item */
interface BreadcrumbItem {
    id: string;
    name: string;
}

interface Filters {
    creator: string;
    type: string;
    ocrStatus: string;
}

/** ---------------- Component ---------------- */

export default function KnowledgeBasePage() {
    const { getToken } = useKindeAuth();

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem("kb_visible_columns");
        return saved ? JSON.parse(saved) : DEFAULT_KB_COLUMNS;
    });

    useEffect(() => {
        localStorage.setItem("kb_visible_columns", JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleResize = () => {
            const isBigger = window.innerWidth > 1440;
            const max = isBigger ? 7 : 5;
            if (visibleColumns.length > max) {
                setVisibleColumns(prev => prev.slice(0, max));
            }
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, [visibleColumns]);

    // Selection states
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Navigation stack — each item is { id, name }. Empty = root.
    const [folderStack, setFolderStack] = useState<BreadcrumbItem[]>([]);

    // Contents at the current level
    const [childFolders, setChildFolders] = useState<any[]>([]);
    const [childFiles, setChildFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Root folder ID returned by backend
    const [rootFolderId, setRootFolderId] = useState<string | null>(null);

    // PERFORMANCE: Search with debouncing
    // searchInput is updated immediately for responsive UI
    // debouncedSearch is used for actual filtering (with 300ms delay)
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);

    const [filters, setFilters] = useState<Filters>({
        creator: "",
        type: "",
        ocrStatus: "",
    });

    // Drawer open states
    const [folderOpen, setFolderOpen] = useState(false);
    const [filesOpen, setFilesOpen] = useState(false);
    const [textOpen, setTextOpen] = useState(false);
    const [urlOpen, setUrlOpen] = useState(false);

    const [detailEntry, setDetailEntry] = useState<KBEntry | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    /** Current folder ID (null = root) */
    const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
    const currentFolderEntry = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;

    // File processing state management (simplified - no WebSocket)
    const getFileProcessingState = (_fileId: string): { status: string } | null => null;

    // Employees list for creator filter options
    const [employeesList, setEmployeesList] = useState<any[]>([]);

    useEffect(() => {
        const fetchEmployeesData = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const empData = await listEmployees(token);
                const list = Array.isArray(empData) ? empData : ((empData as any)?.employees || []);
                setEmployeesList(list);
            } catch (err) {
                console.error("Error fetching employees for KNB filter:", err);
            }
        };
        fetchEmployeesData();
    }, [getToken]);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchContents = useCallback(async (folderId: string | null) => {
        try {
            setIsLoading(true);
            const token = await getToken();
            if (!token) return;

            const data = folderId
                ? await getFolderContents(folderId, token)
                : await getRootContents(token);

            const folders: any[] = data.folders || [];
            const files: any[] = data.files || [];

            setChildFolders(folders);
            setChildFiles(files);

            if (!folderId && data.root_folder_id) {
                setRootFolderId(data.root_folder_id);
            }

            // Real-time OCR status is handled via useRealTimeFileProcessing hook
            // No need to fetch here - WebSocket will provide updates
        } catch (err: any) {
            console.error("Error fetching contents:", err);
            toast.error(err.message || "Failed to load contents");
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchContents(currentFolderId);
    }, [currentFolderId, fetchContents]);

    // Manual refresh will be triggered via UI actions instead of WebSocket

    // ── Derived data ───────────────────────────────────────────────────────────

    const folderEntries = useMemo<KBEntry[]>(
        () => childFolders.map(rawFolderToEntry),
        [childFolders]
    );

    const fileEntries = useMemo<KBEntry[]>(
        () => childFiles.map((f) => {
            const processingState = getFileProcessingState(f.id);
            return rawFileToEntry(f, {
                [f.id]: processingState?.status || f.ocr_status,
            });
        }),
        [childFiles, getFileProcessingState]
    );

    const allCreators = useMemo(() => {
        const names = new Set<string>();
        // Add all active employees from organization
        employeesList.forEach((emp: any) => {
            const firstName = emp.first_name || emp.given_name || "";
            const lastName = emp.last_name || emp.family_name || "";
            const fullName = emp.display_name || `${firstName} ${lastName}`.trim() || emp.name || emp.email?.split("@")[0];
            if (fullName) names.add(fullName);
        });
        // Also ensure any direct creator/uploader names from local files/folders are included
        [...childFolders, ...childFiles].forEach((item) => {
            const name =
                item.creator?.display_name || item.creator?.email ||
                item.uploader?.display_name || item.uploader?.email;
            if (name) names.add(name);
        });
        return Array.from(names).sort();
    }, [childFolders, childFiles, employeesList]);

    const allEntries = useMemo<KBEntry[]>(() => {
        return [...folderEntries, ...fileEntries].filter((e) => {
            // ✅ Use debouncedSearch for filtering (not searchInput)
            if (debouncedSearch && !e.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
            if (filters.creator && e.owner !== filters.creator) return false;
            if (filters.type && e.type.toLowerCase() !== filters.type.toLowerCase()) return false;
            if (filters.ocrStatus && e.ocr_status !== filters.ocrStatus.toLowerCase()) return false;
            return true;
        });
    }, [folderEntries, fileEntries, debouncedSearch, filters]);

    const isEmpty = allEntries.length === 0;

    const drawableFolders = useMemo<KBEntry[]>(() => {
        if (currentFolderId && currentFolderEntry) {
            return [{
                id: currentFolderId,
                name: currentFolderEntry.name,
                type: "folder",
                folder: "",
                owner: "",
                createdDate: "",
            }];
        }
        const list: KBEntry[] = [];
        if (rootFolderId) {
            list.push({
                id: rootFolderId,
                name: "Root Folder",
                type: "folder",
                folder: "",
                owner: "",
                createdDate: "",
            });
        }
        return [...list, ...folderEntries];
    }, [currentFolderId, currentFolderEntry, folderEntries, rootFolderId]);

    // ── Navigation ─────────────────────────────────────────────────────────────

    const navigateInto = (entry: KBEntry) => {
        setSearchInput("");  // ✅ Update to use searchInput instead of search
        setFilters({ creator: "", type: "", ocrStatus: "" });
        setSelected(new Set());
        setFolderStack((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].id === entry.id) {
                return prev;
            }
            return [...prev, { id: entry.id, name: entry.name }];
        });
    };

    const navigateTo = (index: number) => {
        setSearchInput("");  // ✅ Update to use searchInput instead of search
        setFilters({ creator: "", type: "", ocrStatus: "" });
        setSelected(new Set());
        if (index < 0) {
            setFolderStack([]);
        } else {
            setFolderStack((prev) => prev.slice(0, index + 1));
        }
    };

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleCreateFolder = async (payload: CreateFolderPayload) => {
        try {
            const token = await getToken();
            if (!token) return;
            const newFolder = await createFolder({
                name: payload.name,
                description: payload.description,
                parent_folder_id: currentFolderId ?? undefined
            }, token);
            setChildFolders((prev) => [...prev, newFolder]);
            toast.success("Folder created successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to create folder");
            throw error; // Re-throw so the drawer's catch block can close it if needed
        }
    };

    const handleAddFiles = async (folderId: string, files: File[]) => {
        try {
            const token = await getToken();
            if (!token) return;
            toast.loading("Uploading files...", { id: "uploading-files" });
            const result = await uploadFiles(folderId, files, token);
            toast.success("Files uploaded successfully", { id: "uploading-files" });

            const uploadedFiles = (result.files || []).map((f: any) => ({
                id: f.file_id,
                name: f.filename,
                original_filename: f.filename,
                file_size: f.file_size,
                created_at: f.created_at,
                mime_type: f.mime_type || "application/octet-stream",
                uploader: {
                    display_name: "Admin",
                    email: ""
                }
            }));

            if (currentFolderId === folderId || (!currentFolderId && folderId === rootFolderId)) {
                setChildFiles((prev) => [...prev, ...uploadedFiles]);
            }
            setFilesOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to upload files", { id: "uploading-files" });
        }
    };

    /**
     * Save text content as a .txt file and upload it to the target folder.
     * This way it appears in the hierarchy immediately after upload.
     */
    const handleAddText = async (payload: AddTextPayload) => {
        try {
            const token = await getToken();
            if (!token) return;
            toast.loading("Saving text...", { id: "add-text" });

            const fileName = `${payload.title.replace(/[^a-z0-9_\-. ]/gi, "_")}.txt`;
            const blob = new Blob([payload.content], { type: "text/plain" });
            const file = new File([blob], fileName, { type: "text/plain" });

            const result = await uploadFiles(payload.folderId, [file], token);
            toast.success(`"${payload.title}" saved successfully`, { id: "add-text" });

            const uploadedFile = result.files?.[0];
            if (uploadedFile && (currentFolderId === payload.folderId || (!currentFolderId && payload.folderId === rootFolderId))) {
                const newFileObj = {
                    id: uploadedFile.file_id,
                    name: uploadedFile.filename,
                    original_filename: uploadedFile.filename,
                    file_size: uploadedFile.file_size,
                    created_at: uploadedFile.created_at,
                    mime_type: "text/plain",
                    uploader: {
                        display_name: "Admin",
                        email: ""
                    }
                };
                setChildFiles((prev) => [...prev, newFileObj]);
            }
            setTextOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save text", { id: "add-text" });
        }
    };

    /**
     * Save a URL reference as a .txt file and upload it to the target folder.
     */
    const handleAddUrl = async (payload: AddUrlPayload) => {
        try {
            const token = await getToken();
            if (!token) return;
            toast.loading("Saving URL...", { id: "add-url" });

            const displayName = payload.title || payload.url.replace(/^https?:\/\//, "").split("/")[0];
            const fileName = `${displayName.replace(/[^a-z0-9_\-. ]/gi, "_")}.txt`;
            const content = [
                payload.title ? `Title: ${payload.title}` : "",
                `URL: ${payload.url}`,
                `Added: ${new Date().toISOString()}`,
            ].filter(Boolean).join("\n");
            const blob = new Blob([content], { type: "text/plain" });
            const file = new File([blob], fileName, { type: "text/plain" });

            const result = await uploadFiles(payload.folderId, [file], token);
            toast.success(`"${displayName}" saved successfully`, { id: "add-url" });

            const uploadedFile = result.files?.[0];
            if (uploadedFile && (currentFolderId === payload.folderId || (!currentFolderId && payload.folderId === rootFolderId))) {
                const newFileObj = {
                    id: uploadedFile.file_id,
                    name: uploadedFile.filename,
                    original_filename: uploadedFile.filename,
                    file_size: uploadedFile.file_size,
                    created_at: uploadedFile.created_at,
                    mime_type: "text/plain",
                    uploader: {
                        display_name: "Admin",
                        email: ""
                    }
                };
                setChildFiles((prev) => [...prev, newFileObj]);
            }
            setUrlOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save URL", { id: "add-url" });
        }
    };

    const handleDelete = async (id: string, type: "folder" | "file") => {
        const prevFolders = [...childFolders];
        const prevFiles = [...childFiles];

        if (type === "folder") {
            setChildFolders((prev) => prev.filter((f) => f.id !== id));
        } else {
            setChildFiles((prev) => prev.filter((f) => f.id !== id));
        }

        try {
            const token = await getToken();
            if (!token) {
                setChildFolders(prevFolders);
                setChildFiles(prevFiles);
                return;
            }
            if (type === "file") {
                toast.loading("Removing document...", { id: "del-doc" });
                const res = await deleteFiles([id], token);
                if (res.errors && res.errors.length > 0) {
                    throw new Error(res.errors[0].error || "Failed to remove document");
                }
                toast.success("Document removed successfully", { id: "del-doc" });
            } else {
                toast.loading("Deleting folder...", { id: "del-folder" });
                await deleteFolder(id, token);
                toast.success("Folder deleted successfully", { id: "del-folder" });
            }
        } catch (error: any) {
            const toastId = type === "file" ? "del-doc" : "del-folder";
            toast.error(error.message || "Failed to delete item", { id: toastId });
            setChildFolders(prevFolders);
            setChildFiles(prevFiles);
        }
    };

    const handleBatchDelete = async () => {
        setIsBatchProcessing(true);
        try {
            const fileIds: string[] = [];
            const folderIds: string[] = [];
            selected.forEach(id => {
                const entry = allEntries.find(e => e.id === id);
                if (entry) {
                    if (entry.type === "file") {
                        fileIds.push(id);
                    } else {
                        folderIds.push(id);
                    }
                }
            });

            const token = await getToken();
            if (!token) return;

            const promises = [];
            if (fileIds.length > 0) {
                promises.push(deleteFiles(fileIds, token).then(res => {
                    if (res.errors && res.errors.length > 0) {
                        throw new Error(res.errors[0].error || "Failed to remove some documents");
                    }
                }));
            }
            folderIds.forEach(id => {
                promises.push(deleteFolder(id, token));
            });

            await Promise.all(promises);
            toast.success("Selected items deleted successfully");

            setChildFolders(prev => prev.filter(f => !selected.has(f.id)));
            setChildFiles(prev => prev.filter(f => !selected.has(f.id)));
            setSelected(new Set());
        } catch (error: any) {
            console.error("Batch delete error", error);
            toast.error(error.message || "Failed to delete selected items");
        } finally {
            setIsBatchProcessing(false);
            setConfirmBatchDelete(false);
        }
    };

    const handleView = (entry: KBEntry) => {
        if (entry.type === "folder") {
            navigateInto(entry);
        } else {
            setDetailEntry(entry);
            setDetailOpen(true);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 sm:p-8 flex flex-col h-full w-full overflow-hidden" data-testid="knowledge-base-page" data-tour="knowledge-base-page">

            {/* Header / Breadcrumbs */}
            <div className="flex-shrink-0 flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center flex-wrap gap-2 text-2xl tracking-tight select-none">
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => folderStack.length > 0 && navigateTo(-1)}
                                disabled={folderStack.length === 0}
                                className={
                                    folderStack.length === 0
                                        ? "text-zinc-900 dark:text-zinc-100 font-bold cursor-default"
                                        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-medium cursor-pointer"
                                }
                            >
                                Knowledge Base
                            </button>
                            {folderStack.length === 0 && !isLoading && (
                                <Badge className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fade-in">
                                    {childFolders.length + childFiles.length}
                                </Badge>
                            )}
                        </div>

                        {folderStack.map((item, idx) => {
                            const isLast = idx === folderStack.length - 1;
                            if (isLast) {
                                return (
                                    <div key={item.id} className="flex items-center gap-2.5">
                                        <span className="text-zinc-300 dark:text-zinc-700 font-normal">/</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                                            {item.name}
                                        </span>
                                        {!isLoading && (
                                            <Badge className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fade-in">
                                                {childFolders.length + childFiles.length}
                                            </Badge>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <div key={item.id} className="flex items-center gap-2">
                                    <span className="text-zinc-300 dark:text-zinc-700 font-normal">/</span>
                                    <button
                                        onClick={() => navigateTo(idx)}
                                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-medium cursor-pointer"
                                    >
                                        {item.name}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="gap-2 rounded-lg border-[#E7E7E0] bg-[#FEFFFA] hover:bg-[#F5F5F0] dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
                            data-testid="kb-refresh-btn"
                            onClick={() => { fetchContents(currentFolderId); }}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Upload and organize documents, files, and links to train the AI assistant.
                </p>
            </div>

            {/* Action toolbar — always visible */}
            <div className="flex-shrink-0 mt-6 flex flex-wrap items-center gap-3">
                {/* Create Folder always available */}
                <PageActionButton
                    icon={<FolderPlus className="h-3.5 w-3.5" />}
                    label="Create Folder"
                    onClick={() => setFolderOpen(true)}
                    data-testid="create-folder-btn"
                />

                <PageActionButton
                    icon={<FilePlus2 className="h-3.5 w-3.5" />}
                    label="Add Files"
                    onClick={() => setFilesOpen(true)}
                    data-testid="add-files-btn"
                />

                <PageActionButton
                    icon={<Type className="h-3.5 w-3.5" />}
                    label="Add Text"
                    onClick={() => setTextOpen(true)}
                    data-testid="add-text-btn"
                />

                <PageActionButton
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Add URL"
                    onClick={() => setUrlOpen(true)}
                    data-testid="add-url-btn"
                />
            </div>

            {/* Search */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={currentFolderId ? "Search folders and files..." : "Search folders..."}
                        className="h-10 rounded-lg border-[#E7E7E0] dark:border-zinc-700 bg-[#FEFFFA] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
                        data-testid="kb-search-input"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => setSearchInput("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters or Batch Actions */}
            {selected.size > 0 ? (
                <div className="flex-shrink-0 mt-4 flex items-center justify-between gap-3 bg-transparent select-none animate-fade-in">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isBatchProcessing}
                            onClick={() => setConfirmBatchDelete(true)}
                            className="h-10 border-[#E7E7E0] dark:border-zinc-700 text-red-650 hover:text-red-700 dark:text-red-400 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold rounded-lg shadow-sm"
                        >
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                            Delete
                        </Button>
                    </div>
                    {/* Right side selection badge */}
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900 rounded-lg text-sm text-zinc-650 dark:text-zinc-300 font-medium shadow-xs">
                        <span>{selected.size} selected</span>
                        <button
                            type="button"
                            onClick={() => setSelected(new Set())}
                            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
                            aria-label="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-shrink-0 mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterDropdown
                            label="Type"
                            value={filters.type}
                            options={["Folder", "File"]}
                            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                            testId="kb-filter-type"
                        />

                        <FilterDropdown
                            label="Creator"
                            value={filters.creator}
                            options={allCreators.length > 0 ? allCreators : ["Admin"]}
                            onChange={(v) => setFilters((f) => ({ ...f, creator: v }))}
                            testId="kb-filter-creator"
                        />

                        <FilterDropdown
                            label="OCR Status"
                            value={filters.ocrStatus}
                            options={["Pending", "Processing", "Completed", "Failed"]}
                            onChange={(v) => setFilters((f) => ({ ...f, ocrStatus: v }))}
                            testId="kb-filter-ocr"
                        />
                    </div>
                    <ColumnSettings
                        columns={KB_COLUMNS}
                        visibleColumns={visibleColumns}
                        onApply={setVisibleColumns}
                        defaultColumns={DEFAULT_KB_COLUMNS}
                    />
                </div>
            )}

            {/* Table */}
            <div className="mt-5 flex-1 min-h-0 flex flex-col">
                {isLoading ? (
                    <SkeletonTable
                        gridCols="[2fr_1fr_1fr_56px]"
                        mobileGridCols="[1fr_56px]"
                        headers={["Name", "Size / Description", "Creator", ""]}
                        columns={[
                            {
                                width: "w-40",
                                render: () => (
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
                                        <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                                    </div>
                                ),
                            },
                            { width: "w-24", hideOnMobile: true },
                            { width: "w-28", hideOnMobile: true },
                            { width: "w-8", render: () => <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> },
                        ]}
                        showFooter={false}
                    />
                ) : isEmpty ? (
                    <KnowledgeBaseEmptyState />
                ) : (
                    <KnowledgeBaseTable
                        entries={allEntries}
                        onDelete={(id) => {
                            const entry = allEntries.find((e) => e.id === id);
                            handleDelete(id, entry?.type ?? "file");
                        }}
                        onView={handleView}
                        onViewFolderDetails={(entry) => {
                            setDetailEntry(entry);
                            setDetailOpen(true);
                        }}
                        isInsideFolder={!!currentFolderId}
                        visibleColumns={visibleColumns}
                        selected={selected}
                        setSelected={setSelected}
                    />
                )}
            </div>

            {/* Drawers */}


            <CreateFolderDrawer
                open={folderOpen}
                onOpenChange={setFolderOpen}
                onSubmit={handleCreateFolder}
            />

            {/* Add Files — pre-select current folder; at root, choose from top-level folders */}
            <AddFilesDrawer
                open={filesOpen}
                onOpenChange={setFilesOpen}
                onSubmit={handleAddFiles}
                folders={drawableFolders}
                isInsideFolder={!!currentFolderId}
            />

            {/* Add Text — same folder logic */}
            <AddTextDrawer
                open={textOpen}
                onOpenChange={setTextOpen}
                onSubmit={handleAddText}
                folders={drawableFolders}
                isInsideFolder={!!currentFolderId}
            />

            {/* Add URL — same folder logic */}
            <AddUrlDrawer
                open={urlOpen}
                onOpenChange={setUrlOpen}
                onSubmit={handleAddUrl}
                folders={drawableFolders}
                isInsideFolder={!!currentFolderId}
            />

            {/* File detail drawer */}
            <KnowledgeBaseDetailDrawer
                open={detailOpen}
                onOpenChange={setDetailOpen}
                entry={detailEntry}
                onRefreshParent={() => fetchContents(currentFolderId)}
            />

            {/* Batch Delete Confirmation Dialog */}
            <Dialog open={confirmBatchDelete} onOpenChange={(open) => !open && setConfirmBatchDelete(false)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Delete Selected Items</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete the {selected.size} selected items? This action cannot be undone and will permanently remove them from the knowledge base.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmBatchDelete(false)} disabled={isBatchProcessing} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            disabled={isBatchProcessing}
                            onClick={handleBatchDelete}
                        >
                            {isBatchProcessing ? "Deleting..." : "Confirm Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}