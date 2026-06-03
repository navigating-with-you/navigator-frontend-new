import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, FileText, FolderClosed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { getAvailableFilesAndFolders } from "@/lib/api";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

interface FolderWithFiles {
    id: string;
    name: string;
    description: string;
    parent_folder_id?: string;
    file_count: number;
    total_size: number;
    created_at: string;
    files: any[];
}

const highlightText = (text: string, searchWord: string) => {
    if (!searchWord.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${searchWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200/80 dark:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100 px-0.5 rounded font-medium">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

interface AddFilesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unselectedFiles?: any[];
    alreadySelectedFileIds?: string[];
    onAdd: (files: any[]) => void;
}

export default function AddFilesDialog({
    open,
    onOpenChange,
    unselectedFiles,
    alreadySelectedFileIds = [],
    onAdd,
}: AddFilesDialogProps) {
    const { getToken } = useKindeAuth();
    const [search, setSearch] = useState("");
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [folders, setFolders] = useState<FolderWithFiles[]>([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);

    // Load folders with files when dialog opens
    useEffect(() => {
        if (open) {
            loadFoldersAndFiles();
        }
    }, [open]);

    const loadFoldersAndFiles = async () => {
        setIsLoadingFolders(true);
        try {
            const token = await getToken();
            if (!token) return;
            
            const data = await getAvailableFilesAndFolders(token);
            setFolders(data.folders || []);
        } catch (error) {
            console.error("Error loading folders and files:", error);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    // Reset state when opened
    useEffect(() => {
        if (open) {
            setSearch("");
            setCurrentFolderId(null);
            setSelectedFileIds(new Set(alreadySelectedFileIds));
            setSelectedFolderIds(new Set());
            setPage(1);
        }
    }, [open]);

    // Sync folder selection once folders load and when alreadySelectedFileIds changes
    useEffect(() => {
        if (open && folders.length > 0) {
            const initialFileIds = new Set(alreadySelectedFileIds);
            const newSelectedFolderIds = new Set<string>();
            
            const checkFolderSelected = (folderId: string): boolean => {
                const folder = folders.find(f => f.id === folderId);
                if (!folder) return false;
                if (folder.file_count === 0) return false;
                
                const filesAllSelected = folder.files.every(file => initialFileIds.has(file.id));
                const subfolders = folders.filter(f => f.parent_folder_id === folderId);
                const subfoldersAllSelected = subfolders.every(sub => checkFolderSelected(sub.id));
                
                return filesAllSelected && subfoldersAllSelected;
            };

            folders.forEach(f => {
                if (checkFolderSelected(f.id)) {
                    newSelectedFolderIds.add(f.id);
                }
            });
            setSelectedFolderIds(newSelectedFolderIds);
        }
    }, [open, folders]);

    // Breadcrumbs path calculation
    const breadcrumbs = useMemo(() => {
        if (!currentFolderId) return [{ id: null, name: "Home" }];

        const path: Array<{ id: string | null; name: string }> = [];
        let current = folders.find(f => f.id === currentFolderId);
        while (current) {
            path.unshift({ id: current.id, name: current.name });
            if (current.parent_folder_id) {
                const parent = folders.find(f => f.id === current.parent_folder_id);
                if (parent && parent.name !== 'Root') {
                    current = parent;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        path.unshift({ id: null, name: "Home" });
        return path;
    }, [currentFolderId, folders]);

    // Build flat list of items (folders + files) for current level
    const flatItems = useMemo(() => {
        const items: Array<{ type: 'folder' | 'file'; data: any; folderId?: string; isRootFile?: boolean }> = [];
        const rootFolder = folders.find(f => f.name === 'Root');

        if (!currentFolderId) {
            // Level 1: Root folder files at the top level (Home)
            if (rootFolder) {
                rootFolder.files.forEach(file => {
                    items.push({ type: 'file', data: file, folderId: rootFolder.id, isRootFile: true });
                });
            }

            // Level 1: Folders whose parent is Root (or null)
            const level1Folders = folders.filter(f =>
                f.name !== 'Root' &&
                (f.parent_folder_id === rootFolder?.id || !f.parent_folder_id)
            );
            level1Folders.forEach(folder => {
                items.push({ type: 'folder', data: folder });
            });
        } else {
            // Inside a folder
            const currentFolder = folders.find(f => f.id === currentFolderId);
            if (currentFolder) {
                // Add subfolders
                const subfolders = folders.filter(f => f.parent_folder_id === currentFolderId);
                subfolders.forEach(sub => {
                    items.push({ type: 'folder', data: sub });
                });

                // Add files belonging to this folder
                currentFolder.files.forEach(file => {
                    items.push({ type: 'file', data: file, folderId: currentFolderId });
                });
            }
        }

        return items;
    }, [folders, currentFolderId]);

    // Filter items by search (global search across all folders/files)
    const filteredItems = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return flatItems;

        const items: Array<{ type: 'folder' | 'file'; data: any; folderId?: string }> = [];
        const fileMatches = (file: any) => {
            const name = file.original_filename || file.name || "";
            return name.toLowerCase().includes(query);
        };
        const folderMatches = (folder: any) => {
            return folder.name.toLowerCase().includes(query);
        };

        folders.forEach(folder => {
            if (folder.name !== 'Root' && folderMatches(folder)) {
                items.push({ type: 'folder', data: folder });
            }
            folder.files.forEach(file => {
                if (fileMatches(file)) {
                    items.push({ type: 'file', data: file, folderId: folder.id });
                }
            });
        });

        const seen = new Set<string>();
        return items.filter(item => {
            const key = `${item.type}-${item.data.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [folders, search, flatItems]);

    // Pagination
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / rowsPerPage) || 1;
    const startIdx = (page - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, total);

    const paginatedItems = useMemo(() => {
        return filteredItems.slice(startIdx, endIdx);
    }, [filteredItems, startIdx, endIdx]);

    const handleFolderClick = (folderId: string | null) => {
        setCurrentFolderId(folderId);
        setSearch("");
        setPage(1);
    };

    const toggleFolderSelection = (folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;

        const getDescendantFolders = (id: string): FolderWithFiles[] => {
            const sub = folders.filter(f => f.parent_folder_id === id);
            return [...sub, ...sub.flatMap(sf => getDescendantFolders(sf.id))];
        };

        const targetFolders = [folder, ...getDescendantFolders(folderId)];

        setSelectedFolderIds((prev) => {
            const next = new Set(prev);
            const isSelected = next.has(folderId);

            if (isSelected) {
                targetFolders.forEach(tf => next.delete(tf.id));
                setSelectedFileIds((prevFiles) => {
                    const nextFiles = new Set(prevFiles);
                    targetFolders.forEach(tf => {
                        tf.files.forEach(file => nextFiles.delete(file.id));
                    });
                    return nextFiles;
                });
            } else {
                targetFolders.forEach(tf => {
                    if (tf.file_count > 0) {
                        next.add(tf.id);
                    }
                });
                setSelectedFileIds((prevFiles) => {
                    const nextFiles = new Set(prevFiles);
                    targetFolders.forEach(tf => {
                        tf.files.forEach(file => nextFiles.add(file.id));
                    });
                    return nextFiles;
                });
            }
            return next;
        });
    };

    const toggleFile = (fileId: string, folderId: string) => {
        setSelectedFileIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
                setSelectedFolderIds((prevFolders) => {
                    const nextFolders = new Set(prevFolders);
                    let currentId: string | undefined = folderId;
                    while (currentId) {
                        nextFolders.delete(currentId);
                        const parent = folders.find(f => f.id === currentId);
                        currentId = parent?.parent_folder_id;
                    }
                    return nextFolders;
                });
            } else {
                next.add(fileId);
                
                const checkFolderFullySelected = (fId: string, currentFileSelection: Set<string>, currentFolderSelection: Set<string>): boolean => {
                    const f = folders.find(folderItem => folderItem.id === fId);
                    if (!f) return false;
                    
                    const filesAllSelected = f.files.every(file => currentFileSelection.has(file.id));
                    const subfolders = folders.filter(folderItem => folderItem.parent_folder_id === fId);
                    const subfoldersAllSelected = subfolders.every(sub => currentFolderSelection.has(sub.id));
                    
                    return filesAllSelected && subfoldersAllSelected;
                };

                setSelectedFolderIds((prevFolders) => {
                    const nextFolders = new Set(prevFolders);
                    let currentId: string | undefined = folderId;
                    
                    while (currentId) {
                        if (checkFolderFullySelected(currentId, next, nextFolders)) {
                            nextFolders.add(currentId);
                            const parent = folders.find(folderItem => folderItem.id === currentId);
                            currentId = parent?.parent_folder_id;
                        } else {
                            break;
                        }
                    }
                    return nextFolders;
                });
            }
            return next;
        });
    };

    const handleAdd = () => {
        const allFiles: any[] = [];
        folders.forEach(folder => {
            folder.files.forEach(file => {
                if (selectedFileIds.has(file.id)) {
                    allFiles.push({
                        ...file,
                        folderName: folder.name,
                        folderId: folder.id,
                    });
                }
            });
        });
        onAdd(allFiles);
        onOpenChange(false);
    };

    const totalSelected = selectedFileIds.size;
    const formatSize = (bytes: number) => {
        if (!bytes) return "0 B";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[700px] w-[calc(100vw-32px)] sm:w-full p-0 bg-[#FEFFFA] dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_#0000001A] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[600px]">
                <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Add Files to Category
                    </DialogTitle>
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 font-medium select-none mt-1.5">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.id || "root"}>
                                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                                <button
                                    type="button"
                                    onClick={() => handleFolderClick(crumb.id)}
                                    className={cn(
                                        "hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-sans text-[14px]",
                                        idx === breadcrumbs.length - 1
                                            ? "text-zinc-800 dark:text-zinc-200 font-semibold pointer-events-none"
                                            : "text-zinc-500 dark:text-zinc-400"
                                    )}
                                >
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-5 pb-4 shrink-0 space-y-4">

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search File Name..."
                                className="h-10 w-full rounded-lg border-zinc-200 dark:border-zinc-700 pl-10 text-sm focus:ring-blue-500/20"
                            />
                        </div>

                        {/* List Count & Selection Info Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Files list
                                </span>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-50 rounded text-xs font-semibold px-2">
                                    {total}
                                </Badge>
                            </div>
                            {totalSelected > 0 && (
                                <div className="flex items-center gap-1.5 rounded bg-zinc-100/80 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                                    <span>{totalSelected} file{totalSelected !== 1 ? 's' : ''} selected</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFileIds(new Set());
                                            setSelectedFolderIds(new Set());
                                        }}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                        aria-label="Clear selection"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-auto flex flex-col px-6">
                        {/* Table Header */}
                        <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#FEFFFA] dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-t-lg px-4 py-3 shrink-0">
                            <div className="w-6" /> {/* Spacer for checkbox */}
                            <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-300 uppercase tracking-wider">
                                Name
                            </span>
                        </div>

                        {/* Table Body */}
                        <div className="border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-lg divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {isLoadingFolders ? (
                                <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    Loading folders and files...
                                </div>
                            ) : paginatedItems.length === 0 ? (
                                <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    No files or folders found.
                                </div>
                            ) : (
                                paginatedItems.map((item) => {
                                    if (item.type === 'folder') {
                                        const folder = item.data;
                                        const isFolderSelected = selectedFolderIds.has(folder.id);
                                        const isEmptyFolder = folder.file_count === 0;

                                        return (
                                            <div
                                                key={`folder-${folder.id}`}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 transition-all duration-200 ease-in-out cursor-pointer",
                                                    isFolderSelected
                                                        ? "bg-blue-50/40 dark:bg-blue-900/20"
                                                        : "bg-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50",
                                                    isEmptyFolder && "opacity-50 pointer-events-none cursor-not-allowed"
                                                )}
                                                onClick={() => !isEmptyFolder && handleFolderClick(folder.id)}
                                            >
                                                {isEmptyFolder ? (
                                                    <div className="w-4 h-4 shrink-0" />
                                                ) : (
                                                    <Checkbox
                                                        checked={isFolderSelected}
                                                        onCheckedChange={() => toggleFolderSelection(folder.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                )}
                                                <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                                    {isEmptyFolder ? (
                                                        <div className="w-4 h-4 shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                                                    )}
                                                    <div className="h-9 w-9 shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-200/60 dark:border-blue-700/60 text-blue-600 dark:text-blue-400">
                                                        <FolderClosed className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                            {highlightText(folder.name, search)}
                                                        </span>
                                                        <span className="text-xs text-zinc-550 dark:text-zinc-400 truncate mt-0.5">
                                                            {folder.file_count} file{folder.file_count !== 1 ? 's' : ''} • {formatSize(folder.total_size)}
                                                        </span>
                                                        {folder.description && (
                                                            <span className="text-xs text-zinc-400 dark:text-zinc-505 truncate mt-0.5">
                                                                {highlightText(folder.description, search)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        const file = item.data;
                                        const isSelected = selectedFileIds.has(file.id);

                                        return (
                                            <div
                                                key={`file-${file.id}`}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 transition-all duration-200 ease-in-out cursor-pointer",
                                                    isSelected
                                                        ? "bg-blue-50/40 dark:bg-blue-900/20"
                                                        : "bg-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                                                )}
                                                onClick={() => toggleFile(file.id, item.folderId!)}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleFile(file.id, item.folderId!)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                                    <div className="w-4 h-4 shrink-0" />
                                                    <div className="h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-500">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words line-clamp-2 sm:line-clamp-none sm:truncate">
                                                            {highlightText(file.original_filename || file.name, search)}
                                                        </span>
                                                        <span className="text-xs text-zinc-555 dark:text-zinc-400 truncate font-mono mt-0.5">
                                                            {formatSize(file.file_size)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls (Pagination & Actions) */}
                <div className="flex flex-col gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-[#FEFFFA] dark:bg-zinc-950">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">Rows per Page</span>
                            <Select
                                value={rowsPerPage.toString()}
                                onValueChange={(v) => {
                                    setRowsPerPage(Number(v));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-7 w-16 text-xs bg-zinc-50 dark:bg-zinc-900 border-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3 justify-between sm:justify-start">
                            <span className="whitespace-nowrap">{total > 0 ? startIdx + 1 : 0}-{endIdx} of {total}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="h-6 w-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                                    {page}
                                </span>
                                <button
                                    type="button"
                                    disabled={page === totalPages || total === 0}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 text-sm font-semibold h-9 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={totalSelected === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-9 px-6"
                        >
                            Add {totalSelected > 0 && `(${totalSelected})`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
