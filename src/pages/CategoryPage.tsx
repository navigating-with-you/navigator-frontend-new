import { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Search, FolderClosed, X, Trash2, Users, FileText } from "lucide-react";
import { PageActionButton } from "@/components/ui/page-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";
import { usePermissions } from "@/hooks/usePermissions";


import { type Category } from "@/types/category";
import CategoryTable from "@/components/category/CategoryTable";
import ColumnSettings from "@/components/ui/ColumnSettings";
import AddEmployeesDialog from "@/components/category/AddEmployeesDialog";
import AddFilesDialog from "@/components/category/AddFilesDialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

const TEAM_COLUMNS = [
    { key: "name", label: "Team Name" },
    { key: "managerName", label: "Manager" },
    { key: "kbCount", label: "No. Of Knowledge Base" },
    { key: "employeeCount", label: "No. Of Employees" },
    { key: "createdBy", label: "Created By" },
    { key: "createdDate", label: "Created Date" },
];

const DEFAULT_TEAM_COLUMNS = ["name", "managerName", "kbCount", "employeeCount"];
const MEMBER_TEAM_COLUMNS = ["name", "kbCount"];

import CategoryDrawer from "@/components/category/CategoryDrawer";
import FilterDropdown from "@/components/FilterDropdown";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { useCachedFiles } from "@/hooks/useCachedFiles";
import UnifiedEmptyState from "@/components/ui/empty-state";

function pLimit(concurrency: number) {
    return async function <T>(tasks: (() => Promise<T>)[]) {
        const results: T[] = new Array(tasks.length);
        let index = 0;
        const worker = async () => {
            while (index < tasks.length) {
                const currentIdx = index++;
                results[currentIdx] = await tasks[currentIdx]();
            }
        };
        const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
        await Promise.all(workers);
        return results;
    };
}

import {
    listGroups,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    addGroupMembers,
    removeGroupMembers,
    addGroupFiles,
    removeGroupFiles,
    listEmployees,
    listRoles,
    listFolders,
    listFiles,
    getRootContents,
} from "@/lib/api";

export default function CategoryPage() {
    const { getToken, isAuthenticated } = useKindeAuth();
    const { role, isLoading: isPermissionsLoading } = usePermissions();
    const isMember = role === "member";

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem("team_visible_columns");
        return saved ? JSON.parse(saved) : DEFAULT_TEAM_COLUMNS;
    });

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
    const [batchAddFilesOpen, setBatchAddFilesOpen] = useState(false);
    const [batchAddEmployeesOpen, setBatchAddEmployeesOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("team_visible_columns", JSON.stringify(visibleColumns));
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

    // Use cached files hook for root-level files
    const { files: cachedFiles } = useCachedFiles({ enabled: isAuthenticated });

    // All KB files across every folder — used as the file pool in the drawer
    const [allKBFiles, setAllKBFiles] = useState<any[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    // Drawer open/edit states
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [drawerMode, setDrawerMode] = useState<"add" | "edit" | "view">("add");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        creator: "",
        manager: "",
        kbFiles: "",
    });

    // Populate categories from API
    const loadCategories = useCallback(async (showSkeleton = false) => {
        if (!isAuthenticated) return;
        if (showSkeleton || categories.length === 0) {
            setIsLoading(true);
        }
        try {
            const token = await getToken();
            if (!token) return;

            // Members don't have employee:view permission — skip employee/role fetches
            let employeesData: any = [];
            let rolesData: any = [];
            const groupsResult = await listGroups(token).catch(() => null);
            const groupsData = groupsResult ?? [];

            if (!isMember) {
                const [empResult, rolesResult] = await Promise.allSettled([
                    listEmployees(token),
                    listRoles(token),
                ]);
                employeesData = empResult.status === "fulfilled" ? empResult.value : [];
                rolesData = rolesResult.status === "fulfilled" ? rolesResult.value : [];
            }


            const currentEmployees = Array.isArray(employeesData)
                ? employeesData
                : ((employeesData as any)?.employees || []);
            const rolesList = Array.isArray(rolesData)
                ? rolesData
                : ((rolesData as any)?.roles || []);
            const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData?.groups || []);

            // Map employees for display
            const mappedEmployees = currentEmployees.map((emp: any) => {
                const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.email?.split("@")[0] || "Unknown";
                return {
                    id: emp.id,
                    name,
                    role: emp.role?.name || "Member",
                    avatar: emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                };
            });
            setEmployeesList(mappedEmployees);

            // Load categories with member details
            if (groupsList.length > 0) {
                const limit = pLimit(5);
                const formatFileSize = (bytes: number): string => {
                    if (!bytes) return "0 B";
                    const k = 1024;
                    const sizes = ["B", "KB", "MB", "GB"];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
                };

                const categoriesData: Category[] = await limit(
                    groupsList.map((g: any) => async () => {
                        try {
                            const details = await getGroup(g.id, token);
                            const members = (details?.members || []) as any[];
                            const rawManagerId = g.created_by || details?.created_by || "";
                            const matchedEmp = mappedEmployees.find((emp: any) => emp.id === rawManagerId);
                            const managerName = matchedEmp ? matchedEmp.name : (rawManagerId || "Administrator");

                            const groupFiles = (details?.files || []) as any[];
                            const mappedFiles = groupFiles.map((f: any) => ({
                                id: f.id,
                                name: f.name,
                                size: formatFileSize(f.file_size || 0),
                                mimeType: f.mime_type || "application/octet-stream",
                                folderId: f.folder_id,
                                folderName: f.folder_path ? f.folder_path.split(" > ").pop() : undefined
                            }));

                            return {
                                id: g.id,
                                name: g.name,
                                description: g.description || "",
                                managerId: rawManagerId,
                                managerName: managerName,
                                kbCount: mappedFiles.length,
                                employeeCount: members.length,
                                employees: members.map((m: any) => {
                                    const empDetails = mappedEmployees.find((emp: any) => emp.id === m.id);
                                    const name = empDetails?.name || (m.display_name || m.email?.split("@")[0] || "Unknown");

                                    let role = "Member";
                                    if (empDetails?.role) {
                                        role = empDetails.role;
                                    } else if (m.role_id) {
                                        const foundRole = rolesList.find((r: any) => r.id === m.role_id);
                                        role = foundRole?.name || m.role_name || "Member";
                                    }

                                    return {
                                        id: m.id,
                                        name: name,
                                        role: role,
                                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                                    };
                                }),
                                files: mappedFiles,
                                type: "Department",
                                createdBy: managerName,
                                createdDate: new Date(g.created_at || Date.now()).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric"
                                }),
                                isArchived: g.is_archived ?? false
                            };
                        } catch (err) {
                            console.error(`Failed to load group ${g.id}:`, err);
                            return {
                                id: g.id,
                                name: g.name,
                                description: g.description || "",
                                managerId: g.created_by || "",
                                managerName: "Administrator",
                                kbCount: 0,
                                employeeCount: 0,
                                employees: [],
                                files: [],
                                type: "Department",
                                createdBy: "Administrator",
                                createdDate: new Date(g.created_at || Date.now()).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric"
                                }),
                                isArchived: g.is_archived ?? false
                            };
                        }
                    })
                );
                setCategories(categoriesData);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.error("Failed to load categories from API:", err);
            toast.error("Failed to load categories");
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, getToken, isMember]);

    // Load categories on mount and when dependencies change
    useEffect(() => {
        if (isAuthenticated && !isPermissionsLoading) {
            loadCategories(true);
        }
    }, [isAuthenticated, isPermissionsLoading, loadCategories]);

    // Fetch all KB files from every folder so the drawer file-pool is complete
    const loadAllKBFiles = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const token = await getToken();
            if (!token) return;

            const formatFileSize = (bytes: number): string => {
                if (!bytes) return "0 B";
                const k = 1024;
                const sizes = ["B", "KB", "MB", "GB"];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
            };

            const mapFile = (f: any, folderId?: string, folderName?: string) => ({
                id: f.id,
                name: f.name,
                size: formatFileSize(f.file_size || f.size || 0),
                mimeType: f.mime_type || "application/octet-stream",
                folderId,
                folderName,
            });

            // 1. Root-level files
            const rootData = await getRootContents(token);
            const rootFiles: any[] = (Array.isArray(rootData?.files) ? rootData.files : []).map((f: any) => mapFile(f, rootData.root_folder_id, "Root"));

            // 2. Files from every folder
            const foldersData = await listFolders(token);
            // listFolders returns a PaginatedResponse: { items: [...], total, ... }
            const foldersList: any[] = Array.isArray(foldersData)
                ? foldersData
                : (Array.isArray(foldersData?.items) ? foldersData.items : []);

            const limit = pLimit(5);
            const folderFileLists = await limit(
                foldersList.map((folder: any) => async () => {
                    try {
                        const filesData = await listFiles(folder.id, token);
                        const rawFiles: any[] = Array.isArray(filesData)
                            ? filesData
                            : (Array.isArray(filesData?.files) ? filesData.files : []);
                        return rawFiles.map((f: any) => mapFile(f, folder.id, folder.name));
                    } catch {
                        return [];
                    }
                })
            );

            // Deduplicate by id
            const seen = new Set<string>();
            const combined: any[] = [];
            for (const f of [...rootFiles, ...folderFileLists.flat()]) {
                if (f.id && !seen.has(f.id)) {
                    seen.add(f.id);
                    combined.push(f);
                }
            }

            setAllKBFiles(combined);
        } catch (err) {
            console.error("Failed to load all KB files:", err);
            // Fall back to cached root files
            setAllKBFiles(cachedFiles);
        }
    }, [isAuthenticated, getToken, cachedFiles]);

    useEffect(() => {
        if (isAuthenticated) {
            loadAllKBFiles();
        }
    }, [isAuthenticated, loadAllKBFiles]);

    const handleRefresh = () => {
        setSelected(new Set());
        loadCategories();
    };

    // Filter Lists options
    const authorizedUsers = useMemo(() => {
        return employeesList
            .filter((emp) => {
                const r = (emp.role || "").toLowerCase().replace("_", "");
                return r === "admin" || r === "superadmin";
            })
            .map((emp) => emp.name)
            .sort();
    }, [employeesList]);

    const creatorOptions = authorizedUsers;
    const managerOptions = authorizedUsers;

    const kbFilesOptions = useMemo(() => {
        return ["0-10 Files", "10-25 Files", "25+ Files"];
    }, []);

    // Filter & search implementation
    const filteredCategories = useMemo(() => {
        const query = search.toLowerCase().trim();
        return categories.filter((cat) => {
            // Text Search
            if (query) {
                const searchString = `${cat.name} ${cat.managerName} ${cat.description} ${cat.id}`.toLowerCase();
                if (!searchString.includes(query)) return false;
            }

            // Dropdown Filters
            if (filters.creator && cat.createdBy !== filters.creator) return false;
            if (filters.manager && cat.managerName !== filters.manager) return false;

            if (filters.kbFiles) {
                const count = cat.kbCount;
                if (filters.kbFiles === "0-10 Files" && (count < 0 || count > 10)) return false;
                if (filters.kbFiles === "10-25 Files" && (count <= 10 || count > 25)) return false;
                if (filters.kbFiles === "25+ Files" && count <= 25) return false;
            }

            return true;
        });
    }, [categories, search, filters]);

    const isEmpty = categories.length === 0;
    const isNoResults = !isEmpty && filteredCategories.length === 0;

    // CRUD Handlers
    const handleCreateOrUpdateCategory = async (newCat: Category) => {
        setIsLoading(true);
        try {
            if (isAuthenticated) {
                const token = await getToken();
                if (token) {
                    const exists = categories.some((c) => c.id === newCat.id);

                    const formatFileSize = (bytes: number): string => {
                        if (!bytes) return "0 B";
                        const k = 1024;
                        const sizes = ["B", "KB", "MB", "GB"];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
                    };

                    if (exists) {
                        // 1. Update name and description
                        await updateGroup(newCat.id, {
                            name: newCat.name,
                            description: newCat.description
                        }, token);

                        // 2. Sync members
                        const original = categories.find((c) => c.id === newCat.id);
                        const originalIds = new Set<string>(original?.employees.map((e: any) => e.id) || []);
                        const currentIds = new Set<string>(newCat.employees.map((e: any) => e.id));

                        const addedIds = Array.from(currentIds).filter(id => !originalIds.has(id));
                        const removedIds = Array.from(originalIds).filter(id => !currentIds.has(id));

                        if (addedIds.length > 0) {
                            await addGroupMembers(newCat.id, addedIds, token);
                        }
                        if (removedIds.length > 0) {
                            await removeGroupMembers(newCat.id, removedIds, token);
                        }

                        // 3. Sync files
                        const originalFileIds = new Set<string>(original?.files?.map((f: any) => f.id) || []);
                        const currentFileIds = new Set<string>(newCat.files?.map((f: any) => f.id) || []);

                        const addedFileIds = Array.from(currentFileIds).filter(id => !originalFileIds.has(id));
                        const removedFileIds = Array.from(originalFileIds).filter(id => !currentFileIds.has(id));

                        if (addedFileIds.length > 0) {
                            await addGroupFiles(newCat.id, addedFileIds, token);
                        }
                        if (removedFileIds.length > 0) {
                            await removeGroupFiles(newCat.id, removedFileIds, token);
                        }

                        // 4. Fetch real updated group details from the database
                        const details = await getGroup(newCat.id, token);
                        const members = (details?.members || []) as any[];
                        const rawManagerId = details?.created_by || newCat.managerId || "";
                        const matchedEmp = employeesList.find((emp: any) => emp.id === rawManagerId);
                        const managerName = matchedEmp ? matchedEmp.name : (rawManagerId || "Administrator");

                        const groupFiles = (details?.files || []) as any[];
                        const mappedFiles = groupFiles.map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            size: formatFileSize(f.file_size || 0),
                            mimeType: f.mime_type || "application/octet-stream",
                            folderId: f.folder_id,
                            folderName: f.folder_path ? f.folder_path.split(" > ").pop() : undefined
                        }));

                        setCategories(prev => prev.map(c => c.id === newCat.id ? {
                            ...c,
                            name: newCat.name,
                            description: newCat.description,
                            managerId: rawManagerId,
                            managerName: managerName,
                            employeeCount: members.length,
                            employees: members.map((m: any) => {
                                const empDetails = employeesList.find((emp: any) => emp.id === m.id);
                                const name = empDetails?.name || (m.display_name || m.email?.split("@")[0] || "Unknown");
                                return {
                                    id: m.id,
                                    name: name,
                                    role: empDetails?.role || m.role_name || "Member",
                                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                                };
                            }),
                            kbCount: mappedFiles.length,
                            files: mappedFiles,
                        } : c));

                        toast.success(`Team "${newCat.name}" updated successfully`);
                    } else {
                        // 1. Create group
                        const response = await createGroup({
                            name: newCat.name,
                            description: newCat.description
                        }, token);

                        const newGroupId = response.id;
                        const currentIds = newCat.employees.map((e: any) => e.id);
                        const currentFileIds = newCat.files?.map((f: any) => f.id) || [];

                        // 2. Add selected members
                        if (currentIds.length > 0) {
                            await addGroupMembers(newGroupId, currentIds, token);
                        }

                        // 3. Add selected files
                        if (currentFileIds.length > 0) {
                            await addGroupFiles(newGroupId, currentFileIds, token);
                        }

                        // 4. Fetch the real group state from the database (includes auto-added super admin)
                        const details = await getGroup(newGroupId, token);
                        const members = (details?.members || []) as any[];
                        const rawManagerId = response.created_by || details?.created_by || "";
                        const matchedEmp = employeesList.find((emp: any) => emp.id === rawManagerId);
                        const managerName = matchedEmp ? matchedEmp.name : (rawManagerId || "Administrator");

                        const groupFiles = (details?.files || []) as any[];
                        const mappedFiles = groupFiles.map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            size: formatFileSize(f.file_size || 0),
                            mimeType: f.mime_type || "application/octet-stream",
                            folderId: f.folder_id,
                            folderName: f.folder_path ? f.folder_path.split(" > ").pop() : undefined
                        }));

                        const createdCat: Category = {
                            id: newGroupId,
                            name: response.name || newCat.name,
                            description: response.description || newCat.description,
                            managerId: rawManagerId,
                            managerName: managerName,
                            kbCount: mappedFiles.length,
                            employeeCount: members.length,
                            employees: members.map((m: any) => {
                                const empDetails = employeesList.find((emp: any) => emp.id === m.id);
                                const name = empDetails?.name || (m.display_name || m.email?.split("@")[0] || "Unknown");
                                return {
                                    id: m.id,
                                    name: name,
                                    role: empDetails?.role || m.role_name || "Member",
                                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                                };
                            }),
                            files: mappedFiles,
                            type: "Department",
                            createdBy: managerName,
                            createdDate: new Date(response.created_at || Date.now()).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            }),
                            isArchived: response.is_archived ?? false
                        };
                        setCategories(prev => [...prev, createdCat]);

                        toast.success(`Team "${newCat.name}" created successfully`);
                    }

                    setDrawerOpen(false);
                }
            } else {
                toast.error("Not authenticated");
            }
        } catch (err) {
            console.error("API Error creating/updating team:", err);
            toast.error("API error creating/updating team");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const target = categories.find((c) => c.id === id);
        if (!target) return;

        const prevCategories = [...categories];
        setCategories((prev) => prev.filter((c) => c.id !== id));

        try {
            if (isAuthenticated) {
                const token = await getToken();
                if (token) {
                    await deleteGroup(id, token);
                    toast.success(`Team "${target.name}" deleted successfully`);
                } else {
                    toast.error("Not authenticated");
                    setCategories(prevCategories);
                }
            } else {
                toast.error("Not authenticated");
                setCategories(prevCategories);
            }
        } catch (err) {
            console.error("API Error deleting team:", err);
            toast.error("API error deleting team");
            setCategories(prevCategories);
        }
    };

    // Archive/unarchive removed for teams

    const handleBatchDelete = async () => {
        setIsBatchProcessing(true);
        try {
            const token = await getToken();
            if (!token) return;

            const promises = Array.from(selected).map((id) => deleteGroup(id, token));
            await Promise.all(promises);

            setCategories((prev) => prev.filter((c) => !selected.has(c.id)));
            setSelected(new Set());
            toast.success("Selected teams deleted successfully");
        } catch (err) {
            console.error("Batch delete error:", err);
            toast.error("Failed to delete selected teams");
        } finally {
            setIsBatchProcessing(false);
            setConfirmBatchDelete(false);
        }
    };

    const handleBatchAddFiles = async (filesToAdd: any[]) => {
        setIsBatchProcessing(true);
        try {
            const token = await getToken();
            if (!token) return;

            const formatFileSize = (bytes: number): string => {
                if (!bytes) return "0 B";
                const k = 1024;
                const sizes = ["B", "KB", "MB", "GB"];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
            };

            const fileIds = filesToAdd.map((f) => f.id);
            const promises = Array.from(selected).map((teamId) =>
                addGroupFiles(teamId, fileIds, token)
            );
            await Promise.all(promises);

            setCategories((prev) =>
                prev.map((c) => {
                    if (selected.has(c.id)) {
                        const existingFiles = c.files || [];
                        const mergedFiles = [...existingFiles];
                        filesToAdd.forEach((newFile) => {
                            if (!mergedFiles.some((f) => f.id === newFile.id)) {
                                mergedFiles.push({
                                    id: newFile.id,
                                    name: newFile.name,
                                    size: newFile.file_size !== undefined ? formatFileSize(newFile.file_size) : (newFile.size || "0 B"),
                                    mimeType: newFile.mime_type || newFile.mimeType || "application/octet-stream"
                                });
                            }
                        });
                        return {
                            ...c,
                            files: mergedFiles,
                            kbCount: mergedFiles.length,
                        };
                    }
                    return c;
                })
            );

            setSelected(new Set());
            toast.success("Files added to selected teams successfully");
        } catch (err) {
            console.error("Batch add files error:", err);
            toast.error("Failed to add files to selected teams");
        } finally {
            setIsBatchProcessing(false);
            setBatchAddFilesOpen(false);
        }
    };

    const handleBatchAddEmployees = async (employeesToAdd: any[]) => {
        setIsBatchProcessing(true);
        try {
            const token = await getToken();
            if (!token) return;

            const employeeIds = employeesToAdd.map((e) => e.id);
            const promises = Array.from(selected).map((teamId) =>
                addGroupMembers(teamId, employeeIds, token)
            );
            await Promise.all(promises);

            setCategories((prev) =>
                prev.map((c) => {
                    if (selected.has(c.id)) {
                        const existingEmployees = c.employees || [];
                        const mergedEmployees = [...existingEmployees];
                        employeesToAdd.forEach((newEmp) => {
                            if (!mergedEmployees.some((e) => e.id === newEmp.id)) {
                                mergedEmployees.push({
                                    id: newEmp.id,
                                    name: newEmp.name,
                                    role: newEmp.role || "Member",
                                    avatar: newEmp.avatar || "",
                                });
                            }
                        });
                        return {
                            ...c,
                            employees: mergedEmployees,
                            employeeCount: mergedEmployees.length,
                        };
                    }
                    return c;
                })
            );

            setSelected(new Set());
            toast.success("Employees assigned to selected teams successfully");
        } catch (err) {
            console.error("Batch assign employees error:", err);
            toast.error("Failed to assign employees to selected teams");
        } finally {
            setIsBatchProcessing(false);
            setBatchAddEmployeesOpen(false);
        }
    };

    // Action Triggers
    const triggerAddMode = () => {
        setSelectedCategory(null);
        setDrawerMode("add");
        setDrawerOpen(true);
    };

    const triggerEditMode = (cat: Category) => {
        setSelectedCategory(cat);
        setDrawerMode("edit");
        setDrawerOpen(true);
    };

    const triggerViewMode = (cat: Category) => {
        setSelectedCategory(cat);
        setDrawerMode("view");
        setDrawerOpen(true);
    };

    const triggerAddEmployeesMode = (cat: Category) => {
        setSelectedCategory(cat);
        setDrawerMode("edit");
        setDrawerOpen(true);
        setTimeout(() => {
            toast.info("Click '+ Add' on the Employees tab to link employees to this team.");
        }, 300);
    };

    return (
        <div className="p-3 sm:p-6 md:p-8 flex flex-col h-auto lg:h-full w-full bg-transparent dark:bg-zinc-950/20 lg:overflow-hidden" data-testid="teams-page" data-tour="teams-page">

            {/* Header */}
            <div className="flex flex-col gap-1 shrink-0">
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                            Teams
                        </h1>
                        {!isLoading && (
                            <Badge className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fade-in">
                                {categories.length}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center">
                        <Button
                            variant="outline"
                            className="gap-2 rounded-lg border-[#E7E7E0] bg-[#FEFFFA] hover:bg-[#F5F5F0] dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
                            onClick={handleRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4 text-zinc-500 dark:text-zinc-400", isLoading && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Group employees and select which folders from the Knowledge Base they can access.
                </p>
            </div>

            {/* Toolbar Buttons */}
            <div className="mt-6 shrink-0 flex flex-wrap gap-3">
                <PermissionGate
                    permission={PERMISSIONS.GROUP_CREATE}
                    fallback={null}
                >
                    <PageActionButton
                        data-tour="add-team-btn"
                        icon={<Plus className="h-3.5 w-3.5" />}
                        label="Add"
                        onClick={triggerAddMode}
                    />
                </PermissionGate>


            </div>

            {/* Search Bar */}
            <div className="relative mt-5 shrink-0 select-none">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <Input
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setSelected(new Set());
                    }}
                    placeholder="Search teams..."
                    className="h-10 rounded-lg border-[#E7E7E0] dark:border-zinc-700 bg-[#FEFFFA] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 placeholder:text-zinc-400 dark:placeholder:text-zinc-550 focus:ring-blue-500/20"
                    data-testid="team-search-input"
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

            {/* Filters or Batch Actions */}
            {selected.size > 0 ? (
                <div className="mt-4 shrink-0 flex items-center justify-between gap-2 bg-transparent select-none animate-fade-in">
                    <div className="flex items-center gap-2">
                        <PermissionGate
                            permission={PERMISSIONS.GROUP_DELETE}
                            fallback={null}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isBatchProcessing}
                                onClick={() => setConfirmBatchDelete(true)}
                                className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-red-650 hover:text-red-700 dark:text-red-400 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                Delete
                            </Button>
                        </PermissionGate>
                        <PermissionGate
                            permission={PERMISSIONS.GROUP_MANAGE_MEMBERS}
                            fallback={null}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isBatchProcessing}
                                onClick={() => setBatchAddFilesOpen(true)}
                                className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <FileText className="h-3.5 w-3.5 text-zinc-500" />
                                Add Files
                            </Button>
                        </PermissionGate>
                        <PermissionGate
                            permission={PERMISSIONS.GROUP_MANAGE_MEMBERS}
                            fallback={null}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isBatchProcessing}
                                onClick={() => setBatchAddEmployeesOpen(true)}
                                className="h-6 px-2.5 border-[#E7E7E0] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 text-xs font-normal rounded-md shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Users className="h-3.5 w-3.5 text-zinc-500" />
                                Assign Employees
                            </Button>
                        </PermissionGate>
                    </div>
                    {/* Right side selection badge */}
                    <div className="flex items-center gap-1.5 px-2.5 h-6 border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900 rounded-md text-xs text-zinc-650 dark:text-zinc-300 font-normal shadow-sm">
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
                <div data-tour="team-filters" className="mt-4 shrink-0 flex items-center justify-between gap-3 w-full select-none">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
                        <FilterDropdown
                            label="Creator"
                            value={filters.creator}
                            options={creatorOptions}
                            onChange={(v) => setFilters((f) => ({ ...f, creator: v }))}
                            testId="filter-creator"
                        />

                        <FilterDropdown
                            label="Manager"
                            value={filters.manager}
                            options={managerOptions}
                            onChange={(v) => setFilters((f) => ({ ...f, manager: v }))}
                            testId="filter-manager"
                        />

                        <FilterDropdown
                            label="Knowledge Base"
                            value={filters.kbFiles}
                            options={kbFilesOptions}
                            onChange={(v) => setFilters((f) => ({ ...f, kbFiles: v }))}
                            testId="filter-kb-files"
                        />
                    </div>
                    <div className="shrink-0 pb-1 flex items-center gap-2">
                        <ColumnSettings
                            columns={TEAM_COLUMNS}
                            visibleColumns={visibleColumns}
                            onApply={setVisibleColumns}
                            defaultColumns={DEFAULT_TEAM_COLUMNS}
                        />
                    </div>
                </div>
            )}

            {/* Body Table Container */}
            <div className="mt-4 flex-1 flex flex-col min-h-0 animate-fade-in">
                {isLoading ? (
                    <SkeletonTable
                        gridCols="[48px_2.5fr_2fr_1.8fr_1.5fr_56px]"
                        headers={[
                            <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />,
                            "Team Name",
                            "Manager",
                            "No. Of Knowledge Base",
                            "No. Of Employees",
                            "",
                        ]}
                        columns={[
                            { width: "w-4", render: () => <div className="h-4 w-4 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" /> },
                            { width: "w-48", render: () => <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> },
                            { width: "w-32", render: () => <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> },
                            { width: "w-16" },
                            { width: "w-16" },
                            { width: "w-8", render: () => <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> },
                        ]}
                    />
                ) : isEmpty ? (
                    <UnifiedEmptyState
                        title="No Data Found"
                        description="No teams have been added yet."
                        icon={<FolderClosed className="h-8 w-8 text-[#60646B] dark:text-zinc-400" />}
                        testId="teams-empty-state"
                    />
                ) : isNoResults ? (
                    <UnifiedEmptyState
                        title={search ? `No results found for "${search}"` : "No results found"}
                        description="Try adjusting your filters or clearing search parameters."
                        testId="teams-search-empty-state"
                    >
                        <Button
                            variant="link"
                            className="text-blue-600 font-semibold text-sm hover:underline p-0 h-auto"
                            onClick={() => {
                                setSearch("");
                                setFilters({ creator: "", manager: "", kbFiles: "" });
                            }}
                        >
                            Clear All Search & Filters
                        </Button>
                    </UnifiedEmptyState>
                ) : (
                    /* Render Interactive Table */
                    <CategoryTable
                        categories={filteredCategories}
                        onDelete={handleDeleteCategory}
                        onEdit={triggerEditMode}
                        onView={triggerViewMode}
                        onAddEmployees={triggerAddEmployeesMode}
                        visibleColumns={isMember ? MEMBER_TEAM_COLUMNS : visibleColumns}
                        selected={selected}
                        setSelected={setSelected}
                    />
                )}
            </div>

            {/* Detail and Creation Drawer */}
            <CategoryDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onSubmit={handleCreateOrUpdateCategory}
                category={selectedCategory}
                mode={drawerMode}
                allEmployees={employeesList}
                allFiles={allKBFiles}
            />

            <AddEmployeesDialog
                open={batchAddEmployeesOpen}
                onOpenChange={setBatchAddEmployeesOpen}
                unselectedEmployees={employeesList}
                onAdd={handleBatchAddEmployees}
            />

            <AddFilesDialog
                open={batchAddFilesOpen}
                onOpenChange={setBatchAddFilesOpen}
                unselectedFiles={allKBFiles}
                onAdd={handleBatchAddFiles}
            />

            {/* Batch Delete Confirmation Dialog */}
            <Dialog open={confirmBatchDelete} onOpenChange={(open) => !open && setConfirmBatchDelete(false)}>
                <DialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-zinc-150 dark:border-zinc-800 shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg">Delete Selected Teams</DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                            Are you sure you want to delete the {selected.size} selected teams? This action is irreversible and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setConfirmBatchDelete(false)} disabled={isBatchProcessing} className="rounded-lg text-zinc-700 dark:text-zinc-300">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-650 hover:bg-red-700 text-white rounded-lg"
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
