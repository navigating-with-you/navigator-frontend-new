import { useMemo, useState, useEffect, useCallback } from "react";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import {
    FolderPlus,
    FilePlus2,
    Type,
    Globe,
    RefreshCw,
    Search,
    Sparkles,
    Info,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import FilterDropdown from "@/components/FilterDropdown";
import KnowledgeBaseEmptyState from "@/components/knowledge-base/KnowledgeBaseEmptyState";
import KnowledgeBaseTable from "@/components/knowledge-base/KnowledgeBaseTable";
import CreateFolderDrawer from "@/components/knowledge-base/CreateFolderDrawer";
import AddFilesDrawer from "@/components/knowledge-base/AddFilesDrawer";
import AddTextDrawer from "@/components/knowledge-base/AddTextDrawer";
import AddUrlDrawer from "@/components/knowledge-base/AddUrlDrawer";
import AskAiDrawer from "@/components/knowledge-base/AskAiDrawer";
import KnowledgeBaseDetailDrawer from "@/components/knowledge-base/KnowledgeBaseDetailDrawer";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import {
    getRootContents,
    getFolderContents,
    createFolder,
    deleteFolder,
    uploadFiles,
    deleteFiles,
    listFolderOcrJobs,
    listEmployees,
} from "@/lib/api";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
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

    // Navigation stack — each item is { id, name }. Empty = root.
    const [folderStack, setFolderStack] = useState<BreadcrumbItem[]>([]);

    // Contents at the current level
    const [childFolders, setChildFolders] = useState<any[]>([]);
    const [childFiles, setChildFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Root folder ID returned by backend
    const [rootFolderId, setRootFolderId] = useState<string | null>(null);

    // OCR status map: file_id → status
    const [ocrStatusMap, setOcrStatusMap] = useState<Record<string, string>>({});

    // Search & filter
    const [search, setSearch] = useState("");
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
    const [askAiOpen, setAskAiOpen] = useState(false);
    const [detailEntry, setDetailEntry] = useState<KBEntry | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    /** Current folder ID (null = root) */
    const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
    const currentFolderEntry = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;

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

            // Enrich files with OCR job status
            if (files.length > 0 && folderId) {
                try {
                    const jobData = await listFolderOcrJobs(folderId, token);
                    const map: Record<string, string> = {};
                    for (const job of jobData.jobs || []) {
                        map[job.file_id] = job.status;
                    }
                    setOcrStatusMap(map);
                } catch {
                    setOcrStatusMap({});
                }
            } else {
                setOcrStatusMap({});
            }
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

    // WebSocket-driven refresh
    useEffect(() => {
        const handleChange = () => fetchContents(currentFolderId);
        cacheWebSocket.on("folder:created", handleChange);
        cacheWebSocket.on("folder:updated", handleChange);
        cacheWebSocket.on("folder:deleted", handleChange);
        cacheWebSocket.on("file:created", handleChange);
        cacheWebSocket.on("file:updated", handleChange);
        cacheWebSocket.on("file:deleted", handleChange);
        return () => {
            cacheWebSocket.off("folder:created", handleChange);
            cacheWebSocket.off("folder:updated", handleChange);
            cacheWebSocket.off("folder:deleted", handleChange);
            cacheWebSocket.off("file:created", handleChange);
            cacheWebSocket.off("file:updated", handleChange);
            cacheWebSocket.off("file:deleted", handleChange);
        };
    }, [currentFolderId, fetchContents]);

    // ── Derived data ───────────────────────────────────────────────────────────

    const folderEntries = useMemo<KBEntry[]>(
        () => childFolders.map(rawFolderToEntry),
        [childFolders]
    );

    const fileEntries = useMemo<KBEntry[]>(
        () => childFiles.map((f) => rawFileToEntry(f, ocrStatusMap)),
        [childFiles, ocrStatusMap]
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
            if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (filters.creator && e.owner !== filters.creator) return false;
            if (filters.type && e.type.toLowerCase() !== filters.type.toLowerCase()) return false;
            if (filters.ocrStatus && e.ocr_status !== filters.ocrStatus.toLowerCase()) return false;
            return true;
        });
    }, [folderEntries, fileEntries, search, filters]);

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
        setSearch("");
        setFilters({ creator: "", type: "", ocrStatus: "" });
        setFolderStack((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].id === entry.id) {
                return prev;
            }
            return [...prev, { id: entry.id, name: entry.name }];
        });
    };

    const navigateTo = (index: number) => {
        setSearch("");
        setFilters({ creator: "", type: "", ocrStatus: "" });
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
            await createFolder({ name: payload.name, description: payload.description }, token);
            toast.success("Folder created successfully");
            await fetchContents(currentFolderId);
            setFolderOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create folder");
        }
    };

    const handleAddFiles = async (folderId: string, files: File[]) => {
        try {
            const token = await getToken();
            if (!token) return;
            toast.loading("Uploading files...", { id: "uploading-files" });
            await uploadFiles(folderId, files, token);
            toast.success("Files uploaded successfully", { id: "uploading-files" });
            // Refresh the folder that received the files
            await fetchContents(currentFolderId);
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

            await uploadFiles(payload.folderId, [file], token);
            toast.success(`"${payload.title}" saved successfully`, { id: "add-text" });

            // If we're currently viewing the target folder, refresh immediately
            if (currentFolderId === payload.folderId || !currentFolderId) {
                await fetchContents(currentFolderId);
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

            await uploadFiles(payload.folderId, [file], token);
            toast.success(`"${displayName}" saved successfully`, { id: "add-url" });

            if (currentFolderId === payload.folderId || !currentFolderId) {
                await fetchContents(currentFolderId);
            }
            setUrlOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save URL", { id: "add-url" });
        }
    };

    const handleDelete = async (id: string, type: "folder" | "file") => {
        try {
            const token = await getToken();
            if (!token) return;
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
            await fetchContents(currentFolderId);
        } catch (error: any) {
            const toastId = type === "file" ? "del-doc" : "del-folder";
            toast.error(error.message || "Failed to delete item", { id: toastId });
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
        <div className="px-8 py-6 flex flex-col h-full overflow-hidden" data-testid="knowledge-base-page">

            {/* Header / Breadcrumbs */}
            <div className="flex-shrink-0 flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center flex-wrap gap-2 text-2xl tracking-tight select-none">
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

                        {folderStack.map((item, idx) => {
                            const isLast = idx === folderStack.length - 1;
                            if (isLast) {
                                return (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <span className="text-zinc-300 dark:text-zinc-700 font-normal">/</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                                            {item.name}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setDetailEntry({
                                                    id: item.id,
                                                    name: item.name,
                                                    type: "folder",
                                                    folder: "",
                                                    owner: "",
                                                    createdDate: "",
                                                });
                                                setDetailOpen(true);
                                            }}
                                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                            title="Folder Details"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
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
                        {currentFolderId && childFiles.length > 0 && (
                            <Button
                                onClick={() => setAskAiOpen(true)}
                                className="gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                data-testid="ask-ai-btn"
                            >
                                <Sparkles className="h-4 w-4" />
                                Ask AI
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold"
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
                <Button
                    variant="outline"
                    onClick={() => setFolderOpen(true)}
                    className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 px-5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    data-testid="create-folder-btn"
                >
                    <FolderPlus className="h-4 w-4" />
                    Create Folder
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setFilesOpen(true)}
                    className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 px-5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    data-testid="add-files-btn"
                >
                    <FilePlus2 className="h-4 w-4" />
                    Add Files
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setTextOpen(true)}
                    className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 px-5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    data-testid="add-text-btn"
                >
                    <Type className="h-4 w-4" />
                    Add Text
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setUrlOpen(true)}
                    className="gap-2 rounded-lg border-zinc-200 dark:border-zinc-700 px-5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    data-testid="add-url-btn"
                >
                    <Globe className="h-4 w-4" />
                    Add URL
                </Button>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={currentFolderId ? "Search folders and files..." : "Search folders..."}
                        className="h-10 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
                        data-testid="kb-search-input"
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
            </div>

            {/* Filters */}
            <div className="flex-shrink-0 mt-4 flex flex-wrap items-center gap-2">
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
                    />
                )}
            </div>

            {/* Drawers */}
            <AskAiDrawer
                open={askAiOpen}
                onOpenChange={setAskAiOpen}
                folderId={currentFolderId ?? undefined}
            />

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
        </div>
    );
}