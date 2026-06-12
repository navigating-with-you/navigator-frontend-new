import { useEffect, useRef, useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KBEntry } from "@/types/knowledge-base";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listFiles } from "@/lib/api";

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_EXTENSIONS = /\.(pdf|docx|txt)$/i;
const ALLOWED_ACCEPT = ".pdf,.docx,.txt";

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileWithProgress {
    file: File;
    progress: number; // 0-100
    uploading: boolean;
}

interface AddFilesDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (folderId: string, files: File[]) => Promise<void> | void;
    folders: KBEntry[];
    isInsideFolder?: boolean;
}

export default function AddFilesDrawer({
    open,
    onOpenChange,
    onSubmit,
    folders,
    isInsideFolder = false,
}: AddFilesDrawerProps) {
    const [folder, setFolder] = useState<string>( "");
    const [items, setItems] = useState<FileWithProgress[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

    const { getToken } = useKindeAuth();
    const [existingFileNames, setExistingFileNames] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) {
            setFolder("");
            setItems([]);
            setIsDragging(false);
            setIsUploading(false);
            setRejectedFiles([]);
            setExistingFileNames([]);
        } else if (folders.length > 0) {
            setFolder(folders[0].id);
        }
    }, [open, folders]);

    useEffect(() => {
        if (!open || !folder) {
            setExistingFileNames([]);
            return;
        }

        let isMounted = true;
        const fetchExistingFiles = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const data = await listFiles(folder, token);
                const names = (data.items || []).map((f: any) => f.original_filename || f.name);
                if (isMounted) {
                    setExistingFileNames(names);
                    
                    // Re-validate current items against new folder's files
                    setItems((prevItems) => {
                        const valid: FileWithProgress[] = [];
                        const newlyRejected: string[] = [];
                        const existingNamesLower = names.map((n: string) => n.toLowerCase());
                        
                        prevItems.forEach((item) => {
                            if (existingNamesLower.includes(item.file.name.toLowerCase())) {
                                newlyRejected.push(`"${item.file.name}" — file already present, skipping`);
                            } else {
                                valid.push(item);
                            }
                        });
                        
                        if (newlyRejected.length > 0) {
                            setRejectedFiles((prev) => {
                                const filtered = prev.filter(msg => !newlyRejected.some(newMsg => msg.split(" — ")[0] === newMsg.split(" — ")[0]));
                                return [...filtered, ...newlyRejected];
                            });
                            toast.warning("Some files were removed from the queue because they are already present in the folder.", { id: "files-revalidate" });
                        }
                        return valid;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch files for duplication check:", err);
            }
        };

        fetchExistingFiles();

        return () => {
            isMounted = false;
        };
    }, [open, folder, getToken]);

    const handleFiles = (newFiles: FileList | File[]) => {
        const arr = Array.from(newFiles);
        const valid: FileWithProgress[] = [];
        const rejected: string[] = [];
        const existingNamesLower = existingFileNames.map(n => n.toLowerCase());

        arr.forEach((f) => {
            if (!ALLOWED_EXTENSIONS.test(f.name)) {
                rejected.push(`"${f.name}" — unsupported file type`);
            } else if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                rejected.push(`"${f.name}" — exceeds ${MAX_FILE_SIZE_MB} MB limit`);
            } else if (existingNamesLower.includes(f.name.toLowerCase())) {
                rejected.push(`"${f.name}" — file already present, skipping`);
            } else if (items.some((item) => item.file.name.toLowerCase() === f.name.toLowerCase())) {
                rejected.push(`"${f.name}" — already added to upload queue`);
            } else {
                valid.push({ file: f, progress: 0, uploading: false });
            }
        });

        setItems((prev) => [...prev, ...valid]);
        if (rejected.length > 0) {
            setRejectedFiles((prev) => {
                const filtered = prev.filter(msg => !rejected.some(newMsg => msg.split(" — ")[0] === newMsg.split(" — ")[0]));
                return [...filtered, ...rejected];
            });
        }
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (items.length === 0) return;
        setIsUploading(true);

        // Simulate per-file progress
        const tick = (idx: number, current: number) => {
            if (current >= 100) return;
            const next = Math.min(current + Math.random() * 20 + 10, 100);
            setTimeout(() => {
                setItems((prev) =>
                    prev.map((it, i) =>
                        i === idx ? { ...it, progress: next, uploading: next < 100 } : it
                    )
                );
                if (next < 100) tick(idx, next);
            }, 150);
        };

        setItems((prev) => prev.map((it) => ({ ...it, uploading: true, progress: 0 })));
        items.forEach((_, idx) => tick(idx, 0));

        try {
            await onSubmit(folder, items.map((it) => it.file));
            onOpenChange(false);
        } catch {
            // page handler owns all toast messages
        } finally {
            setIsUploading(false);
        }
    };

    const canAdd = folder.length > 0 && items.length > 0 && !isUploading;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] bg-white dark:bg-zinc-900"
                data-testid="add-files-drawer"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-6 py-5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        data-testid="close-add-files-btn"
                        tabIndex={-1}
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Add Files
                    </SheetTitle>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {/* Folder Select */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Select Folder <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Select value={folder} onValueChange={setFolder} disabled={isInsideFolder || isUploading}>
                            <SelectTrigger
                                className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                data-testid="add-files-folder-select"
                            >
                                <SelectValue placeholder="Select folder" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                {folders.map((f) => (
                                    <SelectItem
                                        key={f.id}
                                        value={f.id}
                                        className="text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-700"
                                    >
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dropzone — card style matching reference */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => !isUploading && inputRef.current?.click()}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center cursor-pointer transition-all",
                            isDragging
                                ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400"
                                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/70",
                            isUploading && "opacity-50 pointer-events-none"
                        )}
                        data-testid="add-files-dropzone"
                    >
                        {/* File icon */}
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-zinc-600 shadow-sm mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-8 w-8 text-zinc-500 dark:text-zinc-300"
                            >
                                <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.414A2 2 0 0 0 20.414 7L17 3.586A2 2 0 0 0 15.586 3H5zm0 2h9v3a2 2 0 0 0 2 2h3v9H5V5zm11 .414L18.586 8H16V5.414z" />
                                <path d="M12 11a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H9a1 1 0 1 1 0-2h2v-2a1 1 0 0 1 1-1z" />
                            </svg>
                        </div>

                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            drag your files to upload or{" "}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                data-testid="add-files-click-here"
                            >
                                Click Here
                            </button>
                        </p>
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Max {MAX_FILE_SIZE_MB} MB per file
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                            .pdf, .docx, .txt
                        </p>

                        <input
                            ref={inputRef}
                            type="file"
                            accept={ALLOWED_ACCEPT}
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleFiles(e.target.files)}
                            data-testid="add-files-input"
                        />
                    </div>

                    {/* Rejected file warnings */}
                    {rejectedFiles.length > 0 && (
                        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 space-y-1">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">Files skipped:</p>
                            {rejectedFiles.map((msg, i) => (
                                <p key={i} className="text-xs text-red-500 dark:text-red-400">{msg}</p>
                            ))}
                            <button
                                type="button"
                                onClick={() => setRejectedFiles([])}
                                className="text-xs text-red-400 hover:underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* File list — table style matching AddEmployeesDialog and CategoryDrawer */}
                    {items.length > 0 && (
                        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden" data-testid="add-files-list">
                            {/* Table Header */}
                            <div className="flex items-center gap-4 bg-zinc-50/80 dark:bg-zinc-800/80 px-4 py-3 sticky top-0 z-10 border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    File Name
                                </span>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                {items.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* File icon */}
                                            <div className="h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-500">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    className="h-4 w-4"
                                                >
                                                    <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.414A2 2 0 0 0 20.414 7L17 3.586A2 2 0 0 0 15.586 3H5zm0 2h9v3a2 2 0 0 0 2 2h3v9H5V5zm11 .414L18.586 8H16V5.414z" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                    {item.file.name}
                                                </span>
                                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-450 truncate mt-0.5">
                                                    {formatFileSize(item.file.size)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress bar (shown while uploading) */}
                                        {item.uploading ? (
                                            <div className="flex items-center gap-3 ml-4">
                                                <div className="flex-shrink-0 w-16 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all duration-150"
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 w-8 text-right">
                                                    {Math.round(item.progress)}%
                                                </span>
                                            </div>
                                        ) : (
                                            /* Trash icon */
                                            <button
                                                type="button"
                                                disabled={isUploading}
                                                onClick={() => removeFile(i)}
                                                className="ml-4 shrink-0 rounded-md p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                                                aria-label="Remove"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                    <Button
                        disabled={!canAdd}
                        onClick={handleSubmit}
                        data-testid="add-files-submit-btn"
                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 font-medium flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            "Add"
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}