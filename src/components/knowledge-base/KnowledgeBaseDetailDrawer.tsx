import { useEffect, useState, useRef, useCallback } from "react";
import { X, FileText, Loader2, Plus, Search, Minus, Download, Clock, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getFolder, uploadFiles, deleteFiles, updateFolder, getFile, getFileDownloadUrl, extractFileText, createOcrJob, retryOcrJob, getFileOcrJob } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealTimeFileProcessing } from "@/hooks/useRealTimeFileProcessing";
import type { KBEntry } from "@/types/knowledge-base";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/utils/rbacConfig";

function OcrStatusBadge({ status }: { status?: string | null }) {
    if (!status) return null;

    const cfg: Record<string, { icon: React.ReactNode; label: string; cls: string; desc: string }> = {
        pending: {
            icon: <Clock className="h-3.5 w-3.5" />,
            label: "Processing",
            cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
            desc: "File is in queue waiting to be processed by the OCR engine.",
        },
        processing: {
            icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
            label: "Processing",
            cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            desc: "Gemini is currently reading the document, extracting text, and generating vector embeddings.",
        },
        completed: {
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            label: "Indexed",
            cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            desc: "OCR processing is complete. The document text is extracted, indexed, and ready for search.",
        },
        failed: {
            icon: <XCircle className="h-3.5 w-3.5" />,
            label: "Failed",
            cls: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
            desc: "OCR processing failed. The document text could not be read or extracted.",
        },
        cancelled: {
            icon: <XCircle className="h-3.5 w-3.5" />,
            label: "Cancelled",
            cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
            desc: "OCR processing was cancelled.",
        },
    };

    const c = cfg[status];
    if (!c) return null;

    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", c.cls)} title={c.desc}>
            {c.icon}
            {c.label}
        </span>
    );
}

interface KBDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: KBEntry | null;
    onRefreshParent?: () => void;
}

export default function KnowledgeBaseDetailDrawer({
    open,
    onOpenChange,
    entry,
    onRefreshParent,
}: KBDetailDrawerProps) {
    const { getToken } = useKindeAuth();

    const { hasPermission } = usePermissions();
    const canEdit = hasPermission(PERMISSIONS.FOLDER_UPDATE);

    // Core states
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Mode toggle state: "view" or "edit"
    const [mode, setMode] = useState<"view" | "edit">("view");

    // Form states (Draft values during edit)
    const [nameDraft, setNameDraft] = useState<string>("");
    const [descDraft, setDescDraft] = useState<string>("");

    // File view states
    const [fileDetails, setFileDetails] = useState<any | null>(null);
    const [folderDetails, setFolderDetails] = useState<any | null>(null);
    const [fetchedFolder, setFetchedFolder] = useState<any | null>(null);
    const [ocrText, setOcrText] = useState<string | null>(null);
    const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [ocrJob, setOcrJob] = useState<any | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // REAL-TIME: Real-time file processing state via WebSocket (no manual polling)
    useRealTimeFileProcessing({
        folderId: entry?.type === "folder" ? entry?.id : null,
        fileIds: entry?.type === "file" ? [entry?.id] : [],
        enabled: open && !!entry?.id,
        onStatusChange: (state) => {
            const updatedJob = {
                job_id: state.fileId,
                status: state.status,
                progress_percentage: state.progress,
                progress_message: state.message,
                error_message: state.error,
            };
            setOcrJob(updatedJob);

            if (state.status === "completed" && entry?.id) {
                fetchExtractedText(entry.id);
            } else if (state.status === "failed") {
                setOcrError(state.error || "OCR extraction failed.");
                setIsOcrLoading(false);
            }
        },
    });

    // Helpers
    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        } catch {
            return "-";
        }
    };

    const fetchExtractedText = useCallback(async (fileId: string) => {
        try {
            const token = await getToken();
            if (!token) return;

            const ocrRes = await extractFileText(fileId, token);
            setOcrText(ocrRes.extracted_text || "");
        } catch (err: any) {
            console.error("Error extracting text:", err);
            setOcrError(err.message || "OCR extraction failed or not available for this file type.");
        } finally {
            setIsOcrLoading(false);
        }
    }, [getToken]);

    const checkOrStartOcrJob = useCallback(async (fileId: string) => {
        try {
            const token = await getToken();
            if (!token) return;

            let job: any = null;
            try {
                job = await getFileOcrJob(fileId, token);
            } catch (err: any) {
                job = await createOcrJob({ file_id: fileId, extraction_type: "standard" }, token);
            }

            setOcrJob(job);

            if (job.status === "completed") {
                await fetchExtractedText(fileId);
            } else if (job.status === "failed") {
                setOcrError(job.error_message || "OCR extraction failed.");
                setIsOcrLoading(false);
            } else if (job.status === "pending" || job.status === "processing") {
                // Real-time updates now handled by WebSocket listener
            } else {
                setIsOcrLoading(false);
            }
        } catch (err: any) {
            console.error("Error checking or starting OCR job:", err);
            setOcrError(err.message || "Failed to process OCR job.");
            setIsOcrLoading(false);
        }
    }, [getToken, fetchExtractedText]);

    // Fetch file metadata and OCR text content
    const fetchFileAllDetails = useCallback(async () => {
        if (!entry || entry.type !== "file") return;
        try {
            setIsLoading(true);
            setIsOcrLoading(true);
            setOcrError(null);
            setOcrText(null);
            setOcrJob(null);

            const token = await getToken();
            if (!token) return;

            // 1. Fetch file details
            const fileData = await getFile(entry.id, token);
            setFileDetails(fileData);

            // 2. Fetch parent folder details
            if (fileData.folder_id) {
                const folderData = await getFolder(fileData.folder_id, token);
                setFolderDetails(folderData);
            }

            // 3. Fetch OCR text or read plain text.
            if (fileData.mime_type === "text/plain") {
                if (fileData.ocr_status === "completed") {
                    await fetchExtractedText(entry.id);
                } else {
                    try {
                        const downloadRes = await getFileDownloadUrl(entry.id, token);
                        if (downloadRes?.download_url) {
                            const fileRes = await fetch(downloadRes.download_url);
                            if (!fileRes.ok) {
                                throw new Error(`Download failed with status ${fileRes.status}`);
                            }
                            const txt = await fileRes.text();
                            setOcrText(txt);
                        } else {
                            await fetchExtractedText(entry.id);
                        }
                    } catch (err: any) {
                        console.warn("Text file download failed, falling back to extracted text:", err);
                        await fetchExtractedText(entry.id);
                    }
                }
                setIsOcrLoading(false);
            } else {
                await checkOrStartOcrJob(entry.id);
            }
        } catch (err: any) {
            console.error("Error fetching file details:", err);
            toast.error(err.message || "Failed to load file details");
            setIsOcrLoading(false);
        } finally {
            setIsLoading(false);
        }
    }, [entry, getToken, checkOrStartOcrJob]);

    // Listen to real-time events from WebSocket to update status and text dynamically
    useEffect(() => {
        if (!open || !entry || entry.type !== "file") return;

        const handleWsEvent = (event: any) => {
            if (import.meta.env.DEV) console.log("[DetailDrawer] WS Event received:", event);

            // Check if this event belongs to the currently active file/job
            const isForCurrentFile = event.resource_id === entry.id || event.metadata?.file_id === entry.id;
            const isForCurrentJob = ocrJob && (event.resource_id === ocrJob.job_id || event.resource_id === ocrJob.id);

            if (isForCurrentFile || isForCurrentJob) {
                if (event.event === "ocr:job_completed") {
                    // Refetch file details and extracted text when completed
                    fetchFileAllDetails();
                } else if (event.event === "ocr:job_updated" || event.event === "ocr:job_created") {
                    // Update OCR job progress in real-time
                    setOcrJob((prev: any) => {
                        const newJob = {
                            ...(prev || {}),
                            status: event.metadata?.status || prev?.status || "processing",
                            progress_percentage: event.metadata?.progress_percentage !== undefined ? event.metadata.progress_percentage : prev?.progress_percentage || 0,
                            progress_message: event.metadata?.progress_message || prev?.progress_message || "",
                            error_message: event.metadata?.error_message || prev?.error_message || null,
                        };
                        return newJob;
                    });

                    // Update ocr_status on fileDetails so badge updates instantly
                    setFileDetails((prev: any) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            ocr_status: event.metadata?.status || prev.ocr_status,
                        };
                    });
                } else if (event.event === "file:updated") {
                    // Refetch if the file metadata changed
                    fetchFileAllDetails();
                }
            }
        };

        cacheWebSocket.on("file:updated", handleWsEvent);
        cacheWebSocket.on("ocr:job_created", handleWsEvent);
        cacheWebSocket.on("ocr:job_updated", handleWsEvent);
        cacheWebSocket.on("ocr:job_completed", handleWsEvent);

        return () => {
            cacheWebSocket.off("file:updated", handleWsEvent);
            cacheWebSocket.off("ocr:job_created", handleWsEvent);
            cacheWebSocket.off("ocr:job_updated", handleWsEvent);
            cacheWebSocket.off("ocr:job_completed", handleWsEvent);
        };
    }, [open, entry, ocrJob, fetchFileAllDetails]);

    const handleRetryOcr = async () => {
        if (!entry) return;
        try {
            setIsOcrLoading(true);
            setOcrError(null);
            const token = await getToken();
            if (!token) return;

            toast.loading("Retrying OCR extraction...", { id: "retry-ocr" });

            if (ocrJob?.job_id) {
                const job = await retryOcrJob(ocrJob.job_id, token);
                toast.success("OCR job retried successfully", { id: "retry-ocr" });
                setOcrJob(job);
                // Real-time updates now handled by useRealTimeFileProcessing hook
            } else {
                toast.success("OCR job started", { id: "retry-ocr" });
                await checkOrStartOcrJob(entry.id);
            }
        } catch (err: any) {
            console.error("Error retrying OCR:", err);
            toast.error(err.message || "Failed to retry OCR", { id: "retry-ocr" });
            setIsOcrLoading(false);
        }
    };

    const handleExport = async () => {
        if (!entry) return;
        try {
            const token = await getToken();
            if (token) {
                toast.loading("Preparing download...", { id: "export-file" });
                const res = await getFileDownloadUrl(entry.id, token);
                if (res?.download_url) {
                    toast.success("Download started", { id: "export-file" });
                    const link = document.createElement("a");
                    link.href = res.download_url;
                    link.setAttribute("download", entry.name);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    throw new Error("Download URL not found");
                }
            }
        } catch (err: any) {
            console.error("Error exporting file:", err);
            toast.error(err.message || "Failed to download file", { id: "export-file" });
        }
    };

    // Fetch the S3 files dynamically from the backend for the opened folder
    const fetchFolderFiles = useCallback(async () => {
        if (!entry || entry.type !== "folder") return;
        try {
            setIsLoading(true);
            const token = await getToken();
            if (token) {
                const folderData = await getFolder(entry.id, token);
                setFiles(folderData.files || []);
                setFetchedFolder(folderData);
                // Update draft values when opening folder/fetching fresh data
                setNameDraft(folderData.name || "");
                setDescDraft(folderData.description || "");
            }
        } catch (err: any) {
            console.error("Error fetching folder details:", err);
            toast.error(err.message || "Failed to load folder details");
        } finally {
            setIsLoading(false);
        }
    }, [entry, getToken]);

    // Reset mode and fetch files on open/entry changes
    useEffect(() => {
        if (open && entry) {
            setMode("view");
            if (entry.type === "folder") {
                fetchFolderFiles();
                setFileDetails(null);
                setFolderDetails(null);
                setFetchedFolder(null);
                setOcrText(null);
                setOcrError(null);
                setOcrJob(null);
            } else {
                setFiles([]);
                setFetchedFolder(null);
                fetchFileAllDetails();
            }
        } else {
            setFiles([]);
            setFileDetails(null);
            setFolderDetails(null);
            setFetchedFolder(null);
            setOcrText(null);
            setOcrError(null);
            setOcrJob(null);
        }
    }, [open, entry, fetchFolderFiles, fetchFileAllDetails]);

    // Handle single file deletion (minus icon)
    const handleDeleteFile = async (fileId: string, filename: string) => {
        const toastId = "del-file-" + fileId;
        try {
            const token = await getToken();
            if (token) {
                toast.loading(`Removing "${filename}"...`, { id: toastId });
                const res = await deleteFiles([fileId], token);
                if (res.errors && res.errors.length > 0) {
                    throw new Error(res.errors[0].error || "Failed to remove document");
                }
                toast.success(`Removed "${filename}" successfully`, { id: toastId });
                fetchFolderFiles();
            }
        } catch (err: any) {
            console.error("Error deleting file:", err);
            toast.error(err.message || "Failed to delete file", { id: toastId });
        }
    };

    // S3 File Upload Handler (instantly triggered via "+ Add" button)
    const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !entry) return;
        try {
            setIsLoading(true);
            const token = await getToken();
            if (token) {
                const fileList = Array.from(e.target.files);
                const existingNames = files.map((f: any) => (f.original_filename || f.name).toLowerCase());
                
                const duplicates = fileList.filter((f) => existingNames.includes(f.name.toLowerCase()));
                const toUpload = fileList.filter((f) => !existingNames.includes(f.name.toLowerCase()));
                
                if (duplicates.length > 0) {
                    const duplicateNames = duplicates.map((f) => `"${f.name}"`).join(", ");
                    if (toUpload.length === 0) {
                        toast.error(`File(s) already present, skipping: ${duplicateNames}`, { id: "drawer-upload" });
                        setIsLoading(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        return;
                    } else {
                        toast.warning(`Skipped already present file(s): ${duplicateNames}`, { id: "drawer-upload-warning", duration: 5000 });
                    }
                }

                toast.loading("Uploading documents to folder...", { id: "drawer-upload" });
                const result = await uploadFiles(entry.id, toUpload, token);

                if (result.errors && result.errors.length > 0) {
                    const serverDuplicates = result.errors.filter((err: any) => err.error?.includes("already exists"));
                    const otherErrors = result.errors.filter((err: any) => !err.error?.includes("already exists"));
                    
                    if (serverDuplicates.length > 0) {
                        const duplicateNames = serverDuplicates.map((err: any) => `"${err.filename}"`).join(", ");
                        toast.error(`File(s) already present, skipping: ${duplicateNames}`, { id: "drawer-upload-server-dup", duration: 5000 });
                    }
                    if (otherErrors.length > 0) {
                        const otherNames = otherErrors.map((err: any) => `"${err.filename}" (${err.error})`).join(", ");
                        toast.error(`Failed to upload: ${otherNames}`, { id: "drawer-upload-server-err" });
                    }
                    
                    if (result.successful_uploads > 0) {
                        toast.success(`Successfully uploaded ${result.successful_uploads} document(s)`, { id: "drawer-upload" });
                    } else {
                        toast.dismiss("drawer-upload");
                    }
                } else {
                    toast.success("Documents added successfully", { id: "drawer-upload" });
                }
                
                fetchFolderFiles();
            }
        } catch (err: any) {
            console.error("Error uploading files:", err);
            toast.error(err.message || "Failed to upload files", { id: "drawer-upload" });
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCancel = () => {
        if (fetchedFolder) {
            setNameDraft(fetchedFolder.name || "");
            setDescDraft(fetchedFolder.description || "");
        } else if (entry) {
            setNameDraft(entry.name || "");
            setDescDraft(entry.description || "");
        }
        setMode("view");
    };

    // Save folder changes (PATCH to backend /folders/{folder_id})
    const handleSave = async () => {
        if (!entry) return;
        try {
            setIsLoading(true);
            const token = await getToken();
            if (token) {
                await updateFolder(entry.id, { name: nameDraft, description: descDraft }, token);
                toast.success("Folder updated successfully");
                setMode("view");
                if (onRefreshParent) onRefreshParent();
                fetchFolderFiles();
            }
        } catch (err: any) {
            console.error("Error saving folder:", err);
            toast.error(err.message || "Failed to save folder changes");
        } finally {
            setIsLoading(false);
        }
    };

    if (!entry) return null;

    // Filter files list locally with search query
    const filteredFiles = files.filter((f) =>
        f.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[1200px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                data-testid="kb-detail-drawer"
            >
                {/* Upper Top Bar */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-8 py-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            tabIndex={-1}
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SheetTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {entry.type === "file" ? "File Details" : "Knowledge Base"}
                        </SheetTitle>
                    </div>
                    {entry.type !== "file" && mode === "view" && canEdit && (
                        <Button
                            type="button"
                            onClick={() => setMode("edit")}
                            className="flex items-center gap-1.5 bg-[#1A56DB] hover:bg-blue-750 text-white px-3.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                        </Button>
                    )}
                </div>

                {/* 2-Column Responsive Body */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto min-h-0 bg-white dark:bg-zinc-900">

                    {entry.type === "file" ? (
                        <>
                            {/* Left Column: File Metadata (4 Cols) */}
                            <div className="md:col-span-4 p-8 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 space-y-5 flex flex-col justify-start bg-white dark:bg-zinc-900">
                                {/* Document ID */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Document ID
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5 break-all">
                                        {fileDetails?.id || entry.id}
                                    </span>
                                </div>

                                {/* Document Pages */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Document Pages
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {isOcrLoading ? (
                                            <span className="text-zinc-400 dark:text-zinc-500 italic">Estimating...</span>
                                        ) : (
                                            `${Math.max(1, Math.ceil((ocrText?.length || 0) / 2500))} pages`
                                        )}
                                    </span>
                                </div>

                                {/* OCR Status */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Processing Status
                                    </span>
                                    <span className="mt-1">
                                        {(() => {
                                            const status = ocrJob?.status || fileDetails?.ocr_status || entry.ocr_status;
                                            return status ? <OcrStatusBadge status={status} /> : <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal">—</span>;
                                        })()}
                                    </span>
                                </div>

                                {/* Document Size */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Document Size
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {fileDetails?.file_size ? formatSize(fileDetails.file_size) : (entry.file_size ? formatSize(entry.file_size) : "—")}
                                    </span>
                                </div>

                                {/* Last Updated On */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Last Updated On
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {fileDetails?.updated_at ? formatDate(fileDetails.updated_at) : "—"}
                                    </span>
                                </div>

                                {/* Folder Name */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Folder Name
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {folderDetails?.name || "—"}
                                    </span>
                                </div>

                                {/* Category */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Category
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {folderDetails?.description || "General"}
                                    </span>
                                </div>

                                {/* Creator */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Creator
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {fileDetails?.uploader?.display_name || fileDetails?.uploader?.email || entry.owner || "—"}
                                    </span>
                                </div>

                                {/* Created On */}
                                <div className="flex flex-col">
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
                                        Created On
                                    </span>
                                    <span className="text-[13px] text-zinc-900 dark:text-zinc-100 font-normal mt-0.5">
                                        {fileDetails?.created_at ? formatDate(fileDetails.created_at) : entry.createdDate || "—"}
                                    </span>
                                </div>
                            </div>

                            {/* Right Column: Extracted Content / File Display (8 Cols) */}
                            <div className="md:col-span-8 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                                {/* Title & Export Button */}
                                <div className="flex items-center justify-between gap-4 pb-2">
                                    <h3 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 truncate min-w-0" title={entry.name}>
                                        {entry.name}
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExport}
                                        className="h-8 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-1 rounded-lg text-xs font-semibold shadow-xs shrink-0"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Export
                                    </Button>
                                </div>

                                {/* Extracted Content container */}
                                <div className="flex-1 mt-4 rounded-2xl overflow-y-auto bg-zinc-50 dark:bg-zinc-950/25 p-8 border border-zinc-100 dark:border-zinc-800/50">
                                    {isOcrLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                                            {!ocrJob || ocrJob.status === "completed" ? (
                                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 animate-pulse">
                                                    Loading document content...
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                        Processing file OCR ({ocrJob.progress_percentage}%)
                                                    </span>
                                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 text-center">
                                                        {ocrJob.progress_message || "Gemini is reading the document structure and extracting text. This might take a moment."}
                                                    </p>
                                                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-4 max-w-[200px]">
                                                        <div
                                                            className="bg-blue-500 h-full transition-all duration-500 ease-out"
                                                            style={{ width: `${ocrJob.progress_percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : ocrError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
                                            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                                            <span className="text-sm font-semibold text-red-500 dark:text-red-400">Content Retrieval Failed</span>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-2 text-center leading-relaxed">
                                                {ocrError}
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRetryOcr}
                                                className="mt-4 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold shadow-xs"
                                            >
                                                Retry Extraction
                                            </Button>
                                        </div>
                                    ) : !ocrText || ocrText.trim() === "" ? (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
                                            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No Content Extracted</span>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 text-center">
                                                This document does not contain any readable text or is empty.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800 dark:text-zinc-300">
                                            {ocrText}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Left Column: Form Details (4 Cols) */}
                            <div className="md:col-span-4 p-8 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 space-y-6 flex flex-col justify-between">
                                <div className="space-y-6">
                                    {/* Folder Name */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                            Folder Name
                                        </Label>
                                        <Input
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            maxLength={100}
                                            disabled={mode === "view"}
                                            placeholder="Enter folder name"
                                            className={cn(
                                                "h-11 rounded-xl border-zinc-200 dark:border-zinc-700 font-medium text-zinc-950 dark:text-zinc-100 focus:border-zinc-400 focus:ring-0 focus-visible:ring-0 transition-all",
                                                mode === "view" && "bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                                            )}
                                        />
                                    </div>

                                    {/* Folder Description */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                            Description
                                        </Label>
                                        <Textarea
                                            value={descDraft}
                                            onChange={(e) => setDescDraft(e.target.value.slice(0, 200))}
                                            maxLength={200}
                                            disabled={mode === "view"}
                                            placeholder="Enter folder description..."
                                            rows={8}
                                            className={cn(
                                                "rounded-xl border-zinc-200 dark:border-zinc-700 font-medium text-zinc-950 dark:text-zinc-100 focus:border-zinc-400 focus:ring-0 focus-visible:ring-0 leading-relaxed resize-none transition-all",
                                                mode === "view" && "bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                                            )}
                                        />
                                        {mode === "edit" && (
                                            <div className="text-[11px] font-medium text-zinc-400 text-right mt-1">
                                                {descDraft.length}/200
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Edit Action Toggle in Left Column removed */}
                            </div>

                            {/* Right Column: Files & Documents List (8 Cols) */}
                            <div className="md:col-span-8 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-8 flex flex-col min-h-0 bg-white dark:bg-zinc-900">

                                {/* Title & "+ Add" Action */}
                                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900">Folder Documents</h3>
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[11px] font-black">{files.length}</span>
                                    </div>

                                    {/* + Add button to quickly upload documents */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        className="h-10 px-4 rounded-xl border-zinc-200 hover:bg-zinc-50 font-bold text-[13px] text-zinc-800 gap-1.5 transition-all shadow-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.docx,.txt"
                                        className="hidden"
                                        onChange={handleUploadFiles}
                                    />
                                </div>

                                {/* Search bar */}
                                <div className="relative mt-5">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search documents..."
                                        className="h-11 rounded-xl border-zinc-200 bg-zinc-50/20 pl-11 text-[13px] font-medium placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-0 transition-all"
                                    />
                                </div>

                                {/* Documents Table/Grid */}
                                <div className="flex-1 mt-5 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                                    {/* Header row */}
                                    <div className="grid grid-cols-12 gap-4 bg-zinc-50/75 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 px-6 py-3.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
                                        <div className="col-span-1 flex items-center justify-center">
                                            <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-650 h-4 w-4 text-blue-600 focus:ring-blue-500 bg-transparent" disabled />
                                        </div>
                                        <div className="col-span-7">Knowledge Base Name</div>
                                        <div className="col-span-3">Last Updated On</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {/* Scrollable Rows */}
                                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {isLoading && files.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-550">
                                                <Loader2 className="h-8 w-8 animate-spin text-zinc-405 mb-2" />
                                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Loading documents...</span>
                                            </div>
                                        ) : filteredFiles.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                                <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No documents found</span>
                                                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1">
                                                    {searchQuery ? "Try refining your search keyword" : "Click 'Add' above to upload documents directly into this folder."}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredFiles.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50/40 transition-colors"
                                                >
                                                    {/* Checkbox column */}
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        <input type="checkbox" className="rounded border-zinc-300 h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                                    </div>

                                                    {/* File metadata title & description */}
                                                    <div className="col-span-7 flex items-center gap-3.5 min-w-0">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200/10">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="truncate min-w-0">
                                                            <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate" title={file.original_filename}>
                                                                {file.original_filename}
                                                            </div>
                                                            <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                                                                {(file.file_size / 1024).toFixed(1)} KB • {file.mime_type ? file.mime_type.split("/")[1]?.toUpperCase() : "Document"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Date updated */}
                                                    <div className="col-span-3 text-[13px] font-semibold text-zinc-500">
                                                        {new Date(file.created_at).toLocaleDateString("en-GB", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                        })}
                                                    </div>

                                                    {/* Delete/Remove button (Rendered ONLY in EDIT MODE!) */}
                                                    <div className="col-span-1 flex items-center justify-center">
                                                        {mode === "edit" ? (
                                                            <button
                                                                onClick={() => handleDeleteFile(file.id, file.original_filename)}
                                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
                                                                aria-label="Delete File"
                                                                title="Delete File"
                                                            >
                                                                <Minus className="h-3 w-3 stroke-[3]" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100/50 border border-zinc-200/50 text-zinc-300 cursor-not-allowed transition-all"
                                                                aria-label="Delete File Disabled"
                                                                title="Click 'Edit Folder Details' to enable file deletion"
                                                                disabled
                                                            >
                                                                <Minus className="h-3 w-3 stroke-[3]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {entry.type !== "file" && mode === "edit" && (
                    <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 px-8 py-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[#1A56DB] hover:text-blue-750 font-semibold text-sm transition-colors cursor-pointer mr-6"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || nameDraft.trim().length === 0}
                            className="rounded-lg bg-blue-600 hover:bg-blue-750 text-white font-semibold h-10 px-6 shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
