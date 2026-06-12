import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { PageActionButton } from "@/components/ui/page-action-button";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";
import {
    FolderPlus,
    FilePlus2,
    Type,
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
    { key: "folder", label: "Size / Description" },
    { key: "owner", label: "Creator" },
    { key: "createdDate", label: "Created Date" },
    { key: "ocr_status", label: "Processing Status" },
];

const DEFAULT_KB_COLUMNS = ["name", "folder", "owner", "ocr_status"];
import CreateFolderDrawer from "@/components/knowledge-base/CreateFolderDrawer";
import AddFilesDrawer from "@/components/knowledge-base/AddFilesDrawer";
import AddTextDrawer from "@/components/knowledge-base/AddTextDrawer";


import KnowledgeBaseDetailDrawer from "@/components/knowledge-base/KnowledgeBaseDetailDrawer";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useUserProfile } from "@/contexts/UserContext";

import {
    getRootContents,
    getFolderContents,
    getFolder,
    createFolder,
    deleteFolder,
    uploadFiles,
    deleteFiles,
    listEmployees,
    createOcrJob,
    retryOcrJob,
    getFileOcrJob,
    listFolderOcrJobs,
} from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealTimeFileProcessing } from "@/hooks/useRealTimeFileProcessing";
import type {
    KBEntry,
    CreateFolderPayload,
    AddTextPayload,
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
    const filesText = f.file_count !== undefined ? `${f.file_count} file${f.file_count !== 1 ? 's' : ''} • ` : "";
    return {
        id: f.id,
        name: f.name,
        type: "folder",
        folder: f.description || "",
        owner: f.creator?.display_name || f.creator?.email || "Unknown",
        createdDate: f.created_at ? `${formatDate(f.created_at)} • ${filesText}${size}` : "-",
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
        ocr_status: (ocrStatusMap?.[file.id] as any) ?? file.ocr_status ?? null,
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
    ocrStatus: string;
}

/** ---------------- Component ---------------- */

export default function KnowledgeBasePage() {
    const { getToken, user } = useKindeAuth();
    const { role, isLoading: isPermissionsLoading, hasPermission } = usePermissions();
    const isMember = role === "member";
    const { userProfile: profile } = useUserProfile();

    const currentUserName = profile?.display_name || (user?.givenName ? `${user.givenName} ${user.familyName || ""}`.trim() : user?.email?.split("@")[0] || "Admin");
    const currentUserEmail = profile?.email || user?.email || "";

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
    // Ref mirrors rootFolderId so fetchContents can read it without being a dep
    const rootFolderIdRef = useRef<string | null>(null);
    const [folderJobs, setFolderJobs] = useState<any[]>([]);

    // PERFORMANCE: Search with debouncing
    // searchInput is updated immediately for responsive UI
    // debouncedSearch is used for actual filtering (with 300ms delay)
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);

    const [filters, setFilters] = useState<Filters>({
        creator: "",
        ocrStatus: "",
    });

    // Drawer open states
    const [folderOpen, setFolderOpen] = useState(false);
    const [filesOpen, setFilesOpen] = useState(false);
    const [textOpen, setTextOpen] = useState(false);


    const [detailEntry, setDetailEntry] = useState<KBEntry | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    /** Current folder ID (null = root) */
    const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
    const currentFolderEntry = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;

    // Employees list for creator filter options
    const [employeesList, setEmployeesList] = useState<any[]>([]);

    useEffect(() => {
        const fetchEmployeesData = async () => {
            if (isPermissionsLoading || isMember || !hasPermission(PERMISSIONS.EMPLOYEE_VIEW)) return;
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
    }, [getToken, isMember, isPermissionsLoading, hasPermission]);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchContents = useCallback(async (folderId: string | null, showSkeleton = false) => {
        try {
            if (showSkeleton || (childFolders.length === 0 && childFiles.length === 0)) {
                setIsLoading(true);
            }
            setFolderJobs([]);
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
                rootFolderIdRef.current = data.root_folder_id;
                setRootFolderId(data.root_folder_id);
            }

            const targetFolderId = folderId || data.root_folder_id || rootFolderIdRef.current;
            // Members don't have access to OCR job status — skip the fetch
            if (targetFolderId && !isMember) {
                try {
                    const jobsData = await listFolderOcrJobs(targetFolderId, token);
                    setFolderJobs(jobsData.jobs || []);
                } catch (jobsErr) {
                    console.error("Error fetching folder OCR jobs:", jobsErr);
                }
            }
        } catch (err: any) {
            console.error("Error fetching contents:", err);
            toast.error(err.message || "Failed to load contents");
        } finally {
            setIsLoading(false);
        }
    }, [getToken, isMember]);

    const fileIds = useMemo(() => childFiles.map(f => f.id), [childFiles]);

    const { getFileProcessingState } = useRealTimeFileProcessing({
        folderId: currentFolderId,
        fileIds,
        enabled: !isLoading && fileIds.length > 0,
        onStatusChange: useCallback((state: any) => {
            if (state.status === "completed" || state.status === "failed" || state.status === "cancelled") {
                fetchContents(currentFolderId);
            }
        }, [currentFolderId, fetchContents]),
    });

    const handleRetryOcr = async (fileId: string) => {
        try {
            const token = await getToken();
            if (!token) return;
            toast.loading("Retrying OCR extraction...", { id: "retry-ocr" });

            let job: any = null;
            try {
                job = await getFileOcrJob(fileId, token);
            } catch (err) {
                // If no job exists, we will create one below
            }

            if (job && job.job_id) {
                await retryOcrJob(job.job_id, token);
            } else {
                await createOcrJob({ file_id: fileId, extraction_type: "standard" }, token);
            }
            toast.success("OCR job retried successfully", { id: "retry-ocr" });
            fetchContents(currentFolderId);
        } catch (err: any) {
            console.error("Error retrying OCR:", err);
            toast.error(err.message || "Failed to retry OCR", { id: "retry-ocr" });
        }
    };

    useEffect(() => {
        fetchContents(currentFolderId, true);
    }, [currentFolderId, fetchContents]);

    useEffect(() => {
        const handleWsChange = (event: any) => {
            if (import.meta.env.DEV) console.log("[KBPage] WS Event received:", event);

            // Directly update the OCR status of the file in the state in real-time
            if (event && (event.event === "ocr:job_created" || event.event === "ocr:job_updated" || event.event === "ocr:job_completed")) {
                const fileId = event.metadata?.file_id || event.resource_id;
                const rawStatus = event.metadata?.status || event.metadata?.ocr_status || "";

                let status = "processing";
                if (event.event === "ocr:job_completed" || rawStatus === "completed" || rawStatus === "success") {
                    status = "completed";
                } else if (event.event === "ocr:job_created" || rawStatus === "pending" || rawStatus === "queued") {
                    status = "pending";
                } else if (rawStatus === "failed") {
                    status = "failed";
                } else if (rawStatus === "cancelled") {
                    status = "cancelled";
                } else if (rawStatus === "processing") {
                    status = "processing";
                }

                if (fileId) {
                    setChildFiles((prevFiles) =>
                        prevFiles.map((file) => {
                            if (file.id === fileId) {
                                return {
                                    ...file,
                                    ocr_status: status,
                                };
                            }
                            return file;
                        })
                    );
                }
            }

            // If a folder is updated, check if it's in the breadcrumb stack and update its name in real-time
            if (event && event.event === "folder:updated") {
                const folderId = event.resource_id;
                if (folderId) {
                    const inStack = folderStack.some(item => item.id === folderId);
                    if (inStack) {
                        getToken().then(token => {
                            if (token) {
                                getFolder(folderId, token).then(folderData => {
                                    setFolderStack(prev =>
                                        prev.map(item =>
                                            item.id === folderId ? { ...item, name: folderData.name } : item
                                        )
                                    );
                                }).catch(err => console.error("Error updating folder stack from WS:", err));
                            }
                        }).catch(err => console.error("Error getting token for folder stack update:", err));
                    }
                }
            }

            // Refresh list for structural changes (create/delete/folder updates).
            // ocr:job_completed is intentionally excluded — useRealTimeFileProcessing
            // already calls fetchContents via onStatusChange for OCR completions.
            if (
                event &&
                (event.event === "file:created" ||
                    event.event === "file:deleted" ||
                    event.event === "folder:created" ||
                    event.event === "folder:updated" ||
                    event.event === "folder:deleted")
            ) {
                fetchContents(currentFolderId);
            }
        };

        cacheWebSocket.on("file:created", handleWsChange);
        cacheWebSocket.on("file:updated", handleWsChange);
        cacheWebSocket.on("file:deleted", handleWsChange);
        cacheWebSocket.on("folder:created", handleWsChange);
        cacheWebSocket.on("folder:updated", handleWsChange);
        cacheWebSocket.on("folder:deleted", handleWsChange);
        cacheWebSocket.on("ocr:job_created", handleWsChange);
        cacheWebSocket.on("ocr:job_updated", handleWsChange);

        return () => {
            cacheWebSocket.off("file:created", handleWsChange);
            cacheWebSocket.off("file:updated", handleWsChange);
            cacheWebSocket.off("file:deleted", handleWsChange);
            cacheWebSocket.off("folder:created", handleWsChange);
            cacheWebSocket.off("folder:updated", handleWsChange);
            cacheWebSocket.off("folder:deleted", handleWsChange);
            cacheWebSocket.off("ocr:job_created", handleWsChange);
            cacheWebSocket.off("ocr:job_updated", handleWsChange);
        };
    }, [currentFolderId, fetchContents, folderStack]);

    // ── Derived data ───────────────────────────────────────────────────────────

    const folderEntries = useMemo<KBEntry[]>(
        () => childFolders.map(rawFolderToEntry),
        [childFolders]
    );

    const ocrJobsMap = useMemo(() => {
        const map: Record<string, string> = {};
        // Since folderJobs is sorted from newest to oldest (created_at desc),
        // we only store the first job status we see for a file.
        folderJobs.forEach((job) => {
            if (job.file_id && !map[job.file_id]) {
                map[job.file_id] = job.status;
            }
        });
        return map;
    }, [folderJobs]);

    const fileEntries = useMemo<KBEntry[]>(
        () => childFiles.map((f) => {
            const processingState = getFileProcessingState(f.id);
            return rawFileToEntry(f, {
                [f.id]: processingState?.status || ocrJobsMap[f.id] || f.ocr_status,
            });
        }),
        [childFiles, getFileProcessingState, ocrJobsMap]
    );

    const allCreators = useMemo(() => {
        if (employeesList.length > 0) {
            return employeesList
                .filter((emp: any) => {
                    let rawRole = "member";
                    if (emp.role && typeof emp.role === "object") {
                        rawRole = emp.role.name;
                    } else if (emp.role && typeof emp.role === "string") {
                        rawRole = emp.role;
                    }
                    const r = (rawRole || "").toLowerCase().replace("_", "");
                    return r === "admin" || r === "superadmin" || r === "editor";
                })
                .map((emp: any) => {
                    const firstName = emp.first_name || emp.given_name || "";
                    const lastName = emp.last_name || emp.family_name || "";
                    return emp.display_name || `${firstName} ${lastName}`.trim() || emp.name || emp.email?.split("@")[0];
                })
                .filter(Boolean)
                .sort();
        }
        // For members (employee list not loaded), derive from visible entries
        return Array.from(new Set([...folderEntries, ...fileEntries].map(e => e.owner).filter(e => e && e !== "Unknown"))).sort() as string[];
    }, [employeesList, folderEntries, fileEntries]);

    const OCR_STATUS_OPTIONS = ["Queued", "Processing", "Indexed", "Failed", "Cancelled"];
    const OCR_STATUS_FILTER_MAP: Record<string, string> = {
        "queued": "pending",
        "processing": "processing",
        "indexed": "completed",
        "failed": "failed",
        "cancelled": "cancelled"
    };

    const allEntries = useMemo<KBEntry[]>(() => {
        return [...folderEntries, ...fileEntries].filter((e) => {
            // ✅ Use debouncedSearch for filtering (not searchInput)
            if (debouncedSearch && !e.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
            if (filters.creator && e.owner !== filters.creator) return false;
            if (filters.ocrStatus) {
                const filterVal = filters.ocrStatus.toLowerCase();
                const targetStatus = OCR_STATUS_FILTER_MAP[filterVal] || filterVal;
                if (e.ocr_status !== targetStatus) return false;
            }
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
        setFilters({ creator: "", ocrStatus: "" });
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
        setFilters({ creator: "", ocrStatus: "" });
        setSelected(new Set());
        if (index < 0) {
            setFolderStack([]);
        } else {
            setFolderStack((prev) => prev.slice(0, index + 1));
        }
    };

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleCreateFolder = async (payload: CreateFolderPayload) => {
        const nameExists = childFolders.some(
            (f) => f.name.toLowerCase() === payload.name.toLowerCase()
        );
        if (nameExists) {
            toast.error("A folder with this name already exists in this folder");
            throw new Error("Folder name must be unique");
        }
        if (payload.name.length > 255) {
            toast.error("Folder name cannot exceed 255 characters");
            throw new Error("Folder name is too long");
        }
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

            if (result.errors && result.errors.length > 0) {
                const duplicates = result.errors.filter((e: any) => e.error?.includes("already exists"));
                const otherErrors = result.errors.filter((e: any) => !e.error?.includes("already exists"));
                
                if (duplicates.length > 0) {
                    const duplicateNames = duplicates.map((e: any) => `"${e.filename}"`).join(", ");
                    toast.error(`File(s) already present, skipping: ${duplicateNames}`, { id: "uploading-files-dup", duration: 5000 });
                }
                
                if (otherErrors.length > 0) {
                    const otherNames = otherErrors.map((e: any) => `"${e.filename}" (${e.error})`).join(", ");
                    toast.error(`Failed to upload: ${otherNames}`, { id: "uploading-files-err" });
                }
                
                if (result.successful_uploads > 0) {
                    toast.success(`Successfully uploaded ${result.successful_uploads} file(s)`, { id: "uploading-files" });
                } else {
                    toast.dismiss("uploading-files");
                }
            } else {
                toast.success("Files uploaded successfully", { id: "uploading-files" });
            }

            const uploadedFiles = (result.files || []).map((f: any) => ({
                id: f.file_id,
                name: f.filename,
                original_filename: f.filename,
                file_size: f.file_size,
                created_at: f.created_at,
                mime_type: f.mime_type || "application/octet-stream",
                uploader: {
                    display_name: currentUserName,
                    email: currentUserEmail
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
            
            if (result.errors && result.errors.length > 0) {
                const dup = result.errors.find((e: any) => e.error?.includes("already exists"));
                if (dup) {
                    toast.error(`"${payload.title}" already present, skipping`, { id: "add-text" });
                    return;
                }
                toast.error(result.errors[0].error || "Failed to save text", { id: "add-text" });
                return;
            }

            toast.success(`"${payload.title}" saved successfully`, { id: "add-text" });

            const uploadedFile = result.files?.[0];
            if (uploadedFile && (currentFolderId === payload.folderId || (!currentFolderId && payload.folderId === rootFolderId))) {
                const newFileObj: any = {
                    id: uploadedFile.file_id,
                    name: uploadedFile.filename,
                    original_filename: uploadedFile.filename,
                    file_size: uploadedFile.file_size,
                    created_at: uploadedFile.created_at,
                    mime_type: "text/plain",
                    uploader: {
                        display_name: currentUserName,
                        email: currentUserEmail
                    }
                    ,
                    // mark as pending so the UI shows queued/processing until worker completes
                    ocr_status: "pending",
                    preview_text: payload.content,
                };
                setChildFiles((prev) => [...prev, newFileObj]);
            }
            setTextOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save text", { id: "add-text" });
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
        <div className="p-3 sm:p-6 md:p-8 flex flex-col h-auto lg:h-full w-full lg:overflow-hidden" data-testid="knowledge-base-page" data-tour="knowledge-base-page">

            {/* Header / Breadcrumbs */}
            <div className="flex-shrink-0 flex flex-col gap-1">
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center flex-wrap gap-2 text-2xl tracking-tight min-w-0 flex-1">
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
                                    <div key={item.id} className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-zinc-300 dark:text-zinc-700 font-normal">/</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-bold truncate max-w-[120px] sm:max-w-xs" title={item.name}>
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
                                <div key={item.id} className="flex items-center gap-2 min-w-0">
                                    <span className="text-zinc-300 dark:text-zinc-700 font-normal">/</span>
                                    <button
                                        onClick={() => navigateTo(idx)}
                                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-medium cursor-pointer truncate max-w-[120px] sm:max-w-xs"
                                        title={item.name}
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
                            className="gap-2 rounded-lg border-surface-sidebar bg-surface-page hover:bg-[#F5F5F0] dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
                            data-testid="kb-refresh-btn"
                            onClick={() => { fetchContents(currentFolderId); }}
                        >
                            <RefreshCw className={cn("h-4 w-4 text-zinc-500 dark:text-zinc-400", isLoading && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Upload and organize documents, files, and links to train the AI assistant.
                </p>
            </div>

            {/* Action toolbar — always visible */}
            <div className="flex-shrink-0 mt-6 flex flex-wrap items-center gap-3">
                {/* Create Folder */}
                {folderStack.length < 2 && (
                    <PermissionGate
                        permission={PERMISSIONS.FOLDER_CREATE}
                        fallback={null}
                    >
                        <PageActionButton
                            icon={<FolderPlus className="h-3.5 w-3.5" />}
                            label="Create Folder"
                            onClick={() => setFolderOpen(true)}
                            data-testid="create-folder-btn"
                        />
                    </PermissionGate>
                )}

                {/* Add Files */}
                <PermissionGate
                    permission={PERMISSIONS.FILE_UPLOAD}
                    fallback={null}
                >
                    <PageActionButton
                        icon={<FilePlus2 className="h-3.5 w-3.5" />}
                        label="Add Files"
                        onClick={() => setFilesOpen(true)}
                        data-testid="add-files-btn"
                    />
                </PermissionGate>

                {/* Add Text */}
                <PermissionGate
                    permission={PERMISSIONS.FILE_UPLOAD}
                    fallback={null}
                >
                    <PageActionButton
                        icon={<Type className="h-3.5 w-3.5" />}
                        label="Add Text"
                        onClick={() => setTextOpen(true)}
                        data-testid="add-text-btn"
                    />
                </PermissionGate>


            </div>

            {/* Search */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={currentFolderId ? "Search folders and files..." : "Search folders..."}
                        className="h-10 rounded-lg border-surface-sidebar dark:border-zinc-700 bg-surface-page dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
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
                <div className="mt-4 shrink-0 flex items-center justify-between gap-2 bg-transparent select-none animate-fade-in">
                    <div className="flex items-center gap-2">
                        <PermissionGate
                            permissions={[PERMISSIONS.FILE_DELETE, PERMISSIONS.FOLDER_DELETE]}
                            fallback={null}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isBatchProcessing}
                                onClick={() => setConfirmBatchDelete(true)}
                                className="h-6 px-2.5 border-surface-sidebar dark:border-zinc-700 text-red-650 hover:text-red-700 dark:text-red-400 bg-surface-page dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                Delete
                            </Button>
                        </PermissionGate>
                    </div>
                    {/* Right side selection badge */}
                    <div className="flex items-center gap-1.5 px-2.5 h-6 border border-surface-sidebar dark:border-zinc-800 bg-surface-page dark:bg-zinc-900 rounded-md text-xs text-zinc-650 dark:text-zinc-300 font-normal shadow-sm">
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
                <div className="flex-shrink-0 mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterDropdown
                            label="Creator"
                            value={filters.creator}
                            options={allCreators}
                            onChange={(v) => setFilters((f) => ({ ...f, creator: v }))}
                            testId="kb-filter-creator"
                        />

                        {/* Status filter — hidden for members (no OCR access) */}
                        {!isMember && (
                            <FilterDropdown
                                label="Status"
                                value={filters.ocrStatus}
                                options={OCR_STATUS_OPTIONS}
                                onChange={(v) => setFilters((f) => ({ ...f, ocrStatus: v }))}
                                testId="kb-filter-ocr"
                            />
                        )}
                    </div>
                    <ColumnSettings
                        columns={isMember ? KB_COLUMNS.filter(c => c.key !== "ocr_status") : KB_COLUMNS}
                        visibleColumns={isMember ? visibleColumns.filter(c => c !== "ocr_status") : visibleColumns}
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
                        onRetryOcr={handleRetryOcr}
                        isInsideFolder={!!currentFolderId}
                        visibleColumns={isMember ? visibleColumns.filter(c => c !== "ocr_status") : visibleColumns}
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