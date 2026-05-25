import { useMemo, useState, useEffect } from "react";
import { Plus, Download, Upload, RefreshCw, Search, FolderClosed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { cn } from "@/lib/utils";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { type Category } from "@/types/category";
import CategoryTable from "@/components/category/CategoryTable";
import CategoryDrawer from "@/components/category/CategoryDrawer";
import FilterDropdown from "@/components/FilterDropdown";
import { SkeletonTable } from "@/components/ui/skeleton-table";

function pLimit(concurrency: number) {
    return async function<T>(tasks: (() => Promise<T>)[]) {
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
    listEmployees,
    getRootContents,
    listRoles,
} from "@/lib/api";

export default function CategoryPage() {
    const { getToken, isAuthenticated } = useKindeAuth();

    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [filesList, setFilesList] = useState<any[]>([]);
    // Drawer open/edit states
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [drawerMode, setDrawerMode] = useState<"add" | "edit" | "view">("add");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        type: "",
        creator: "",
        manager: "",
        kbFiles: "",
    });

    // Populate employees list from API if available
    const fetchEmployeesList = async (token: string) => {
        try {
            const data = await listEmployees(token);
            const list = Array.isArray(data) ? data : (data?.employees || []);
            if (list.length > 0) {
                const mapped = list.map((emp: any) => {
                    const firstName = emp.first_name || emp.given_name || "";
                    const lastName = emp.last_name || emp.family_name || "";
                    const fullName = emp.display_name || `${firstName} ${lastName}`.trim() || emp.name || emp.email?.split("@")[0] || "Unknown";
                    return {
                        id: emp.id,
                        name: fullName,
                        role: emp.role?.name || "Member",
                        avatar: emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
                    };
                });
                setEmployeesList(mapped);
                return mapped;
            }
        } catch (err) {
            console.error("Failed to load employees for category manager matching:", err);
        }
        return [];
    };

    // Populate files list from API if available
    const fetchFilesList = async (token: string) => {
        try {
            const data = await getRootContents(token);
            const files = Array.isArray(data?.files) ? data.files : [];
            const mappedFiles = files.map((f: any) => ({
                id: f.id,
                name: f.name,
                size: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : "Unknown Size",
                mimeType: f.mime_type || "application/octet-stream",
            }));
            setFilesList(mappedFiles);
        } catch (err) {
            console.error("Failed to load files for category mapping:", err);
        }
    };

    // Populate categories from API
    const loadCategories = async () => {
        setIsLoading(true);
        try {
            if (isAuthenticated) {
                const token = await getToken();
                if (token) {
                    // Pre-fetch organization employees & files for mapping
                    const currentEmployees = await fetchEmployeesList(token);
                    await fetchFilesList(token);
                    const rolesData = await listRoles(token).catch(err => {
                        console.error("Error fetching roles in CategoryPage:", err);
                        return [];
                    });
                    const rolesList = Array.isArray(rolesData) ? rolesData : [];

                    const groupsData = await listGroups(token);
                    const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData?.groups || []);

                    if (groupsList.length > 0) {
                        // Fetch detailed members list for each group
                        const limit = pLimit(5);
                        const categoriesData: Category[] = await limit(
                            groupsList.map((g: any) => async () => {
                                try {
                                    const details = await getGroup(g.id, token);
                                    const members = details?.members || [];
                                    const rawManagerId = g.created_by || details?.created_by || "";
                                    const matchedEmp = currentEmployees.find((emp: any) => emp.id === rawManagerId);
                                    const managerName = matchedEmp ? matchedEmp.name : (rawManagerId || "Administrator");

                                    return {
                                        id: g.id,
                                        name: g.name,
                                        description: g.description || "",
                                        managerId: rawManagerId,
                                        managerName: managerName,
                                        kbCount: 0, // In the future, this can be linked to folder sharing APIs
                                        employeeCount: members.length,
                                        employees: members.map((m: any) => {
                                            const matchedEmp = currentEmployees.find((emp: any) => emp.id === m.id);
                                            const nameParts = matchedEmp ? matchedEmp.name : (m.display_name || m.email?.split("@")[0] || "Unknown");
                                            
                                            let rawRole = "member";
                                            if (matchedEmp && matchedEmp.role) {
                                                rawRole = matchedEmp.role;
                                            } else if (m.role_id) {
                                                const foundRole = rolesList.find((r: any) => r.id === m.role_id);
                                                if (foundRole) {
                                                    rawRole = foundRole.name;
                                                } else if (m.role_name) {
                                                    rawRole = m.role_name;
                                                } else {
                                                    rawRole = m.role_id;
                                                }
                                            }

                                            const isUuid = (val: string) => /^[0-9a-fA-F-]{36}$/.test(val);
                                            const finalRole = isUuid(rawRole) ? "Member" : (rawRole === "super_admin" ? "Super Admin" : rawRole.charAt(0).toUpperCase() + rawRole.slice(1));

                                            return {
                                                id: m.id,
                                                name: nameParts,
                                                role: finalRole,
                                                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameParts)}&background=random`
                                            };
                                        }),
                                        files: [],
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
                                    const rawManagerId = g.created_by || "";
                                    const matchedEmp = currentEmployees.find((emp: any) => emp.id === rawManagerId);
                                    const managerName = matchedEmp ? matchedEmp.name : (rawManagerId || "Administrator");
                                    return {
                                        id: g.id,
                                        name: g.name,
                                        description: g.description || "",
                                        managerId: rawManagerId,
                                        managerName: managerName,
                                        kbCount: 0,
                                        employeeCount: g.member_count || 0,
                                        employees: [],
                                        files: [],
                                        type: "Department",
                                        createdBy: managerName,
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
                }
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
    };

    useEffect(() => {
        loadCategories();
    }, [isAuthenticated]);

    const handleRefresh = () => {
        loadCategories();
    };

    // Filter Lists options
    const typeOptions = useMemo(() => {
        const set = new Set<string>();
        categories.forEach((c) => { if (c.type) set.add(c.type); });
        return Array.from(set).sort();
    }, [categories]);

    const creatorOptions = useMemo(() => {
        const set = new Set<string>();
        categories.forEach((c) => { if (c.createdBy) set.add(c.createdBy); });
        return Array.from(set).sort();
    }, [categories]);

    const managerOptions = useMemo(() => {
        const set = new Set<string>();
        categories.forEach((c) => { if (c.managerName) set.add(c.managerName); });
        return Array.from(set).sort();
    }, [categories]);

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
            if (filters.type && cat.type !== filters.type) return false;
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

                        setCategories(prev => prev.map(c => c.id === newCat.id ? {
                            ...c,
                            name: newCat.name,
                            description: newCat.description,
                            managerId: newCat.managerId,
                            managerName: newCat.managerName,
                            employeeCount: newCat.employees.length,
                            employees: newCat.employees,
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

                        // 2. Add selected members
                        if (currentIds.length > 0) {
                            await addGroupMembers(newGroupId, currentIds, token);
                        }

                        const createdCat: Category = {
                            ...newCat,
                            id: newGroupId,
                            createdBy: newCat.managerName || "Admin",
                            createdDate: new Date().toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            })
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

    const handleArchiveCategory = async (id: string) => {
        const target = categories.find((c) => c.id === id);
        if (!target) return;

        const isArchivedNow = !target.isArchived;
        const prevCategories = [...categories];

        setCategories(prev => prev.map(c => c.id === id ? { ...c, isArchived: isArchivedNow } : c));
        toast.success(`Team "${target.name}" ${isArchivedNow ? "archived" : "unarchived"} successfully`);

        try {
            if (isAuthenticated) {
                const token = await getToken();
                if (token) {
                    await updateGroup(id, { is_archived: isArchivedNow }, token);
                } else {
                    toast.error("Not authenticated");
                    setCategories(prevCategories);
                }
            } else {
                toast.error("Not authenticated");
                setCategories(prevCategories);
            }
        } catch (err) {
            console.error("API Error archiving team:", err);
            toast.error("API error archiving team");
            setCategories(prevCategories);
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
        <div className="flex flex-col h-full overflow-hidden bg-zinc-50/20 dark:bg-zinc-950/20" data-testid="teams-page">
            <div className="px-4 sm:px-8 py-6 flex flex-col h-full overflow-y-auto hover-scrollbar" data-tour="teams-page">

                {/* Header */}
                <div className="shrink-0 flex flex-col gap-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Teams
                            </h1>
                            {!isEmpty && (
                                <Badge className="rounded-full bg-blue-50 dark:bg-blue-955 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-fade-in">
                                    {categories.length}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Group employees and select which folders from the Knowledge Base they can access.
                    </p>
                </div>

                {/* Toolbar Buttons */}
                <div className="mt-6 shrink-0 flex flex-wrap gap-3">
                    <Button
                        data-tour="add-team-btn"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={triggerAddMode}
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>

                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50 cursor-not-allowed">
                                        <Download className="h-4 w-4" />
                                        Import
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                Coming soon
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50 cursor-not-allowed">
                                        <Upload className="h-4 w-4" />
                                        Export
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                Coming soon
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Search Bar */}
                <div className="relative mt-5 shrink-0 select-none">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teams..."
                        className="h-10 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20"
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

                {/* Filter Dropdowns */}
                <div data-tour="team-filters" className="mt-4 shrink-0 flex flex-wrap gap-2 select-none">
                    <FilterDropdown
                        label="Type"
                        value={filters.type}
                        options={typeOptions}
                        onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                        testId="filter-type"
                    />

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

                {/* Body Table Container */}
                <div className="mt-6 flex-1 flex flex-col min-h-0 animate-fade-in">
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
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50/20 dark:bg-zinc-900/10 min-h-[300px] mt-2">
                            <div className="h-16 w-16 rounded-full bg-blue-55/80 dark:bg-blue-955 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
                                <FolderClosed className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                No Teams Found
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
                                Get started by adding a team to link your organization employees and knowledge base folders.
                            </p>
                            <Button
                                className="mt-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                                onClick={triggerAddMode}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Team
                            </Button>
                        </div>
                    ) : isNoResults ? (
                        /* Search No Results State */
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50/20 dark:bg-zinc-900/10 min-h-[260px] text-center mt-2 px-6">
                            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                No teams match your search {search ? `"${search}"` : "query"} or active filters.
                            </p>
                            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                                Try adjusting your filters or clearing search parameters.
                            </p>
                            <Button
                                variant="link"
                                className="mt-3 text-blue-600 font-semibold text-sm hover:underline"
                                onClick={() => {
                                    setSearch("");
                                    setFilters({ type: "", creator: "", manager: "", kbFiles: "" });
                                }}
                            >
                                Clear All Search & Filters
                            </Button>
                        </div>
                    ) : (
                        /* Render Interactive Table */
                        <CategoryTable
                            categories={filteredCategories}
                            onDelete={handleDeleteCategory}
                            onEdit={triggerEditMode}
                            onView={triggerViewMode}
                            onAddEmployees={triggerAddEmployeesMode}
                            onArchive={handleArchiveCategory}
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
                    allFiles={filesList}
                />
            </div>
        </div>
    );
}
