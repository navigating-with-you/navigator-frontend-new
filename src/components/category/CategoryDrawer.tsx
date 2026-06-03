import { useEffect, useState, useMemo, type JSX } from "react";
import {
    X,
    AlertCircle,
    Search,
    Plus,
    MinusCircle,
    Users,
    FileText,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Category, type CategoryEmployee, type CategoryFile } from "@/types/category";
import { cn } from "@/lib/utils";
import AddEmployeesDialog from "./AddEmployeesDialog";
import AddFilesDialog from "./AddFilesDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface CategoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (category: Category) => void | Promise<void>;
    category?: Category | null;
    mode: "add" | "edit" | "view";
    allEmployees: any[];
    allFiles: any[];
}

export default function CategoryDrawer({
    open,
    onOpenChange,
    onSubmit,
    category,
    mode = "add",
    allEmployees,
    allFiles,
}: CategoryDrawerProps): JSX.Element {
    const isReadOnly = mode === "view";
    const { role } = usePermissions();
    const isMember = role === "member";

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [managerId, setManagerId] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState<CategoryEmployee[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<CategoryFile[]>([]);
    const [managerSearch, setManagerSearch] = useState("");
    const [managerOpen, setManagerOpen] = useState(false);

    // UI state
    const [activeTab, setActiveTab] = useState<"files" | "employees">("employees");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [fileSearch, setFileSearch] = useState("");
    const [addEmployeesOpen, setAddEmployeesOpen] = useState(false);
    const [addFilesOpen, setAddFilesOpen] = useState(false);
    const [empPage, setEmpPage] = useState(1);
    const [filePage, setFilePage] = useState(1);
    const [rowsPerPage] = useState(50);
    const [touched, setTouched] = useState<{ name?: boolean; managerId?: boolean }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset drawer state on open/close or category changes
    useEffect(() => {
        if (open) {
            if (category && (mode === "edit" || mode === "view")) {
                setName(category.name);
                setDescription(category.description || "");
                setManagerId(category.managerId || "");
                setSelectedEmployees(category.employees || []);
                setSelectedFiles(category.files || []);
            } else {
                setName("");
                setDescription("");
                setManagerId("");
                setSelectedEmployees([]);
                setSelectedFiles([]);
            }
            setTouched({});
            setActiveTab(isMember ? "files" : "employees");
            setEmployeeSearch("");
            setFileSearch("");
            setManagerSearch("");
            setManagerOpen(false);
            setEmpPage(1);
            setFilePage(1);
            setIsSubmitting(false);
        }
    }, [open, category, mode, isMember]);

    const handleBlur = (field: "name" | "managerId") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    // Filter available managers (all employees list)
    const managerOptions = useMemo(() => {
        return allEmployees
            .filter((emp) => emp.id && emp.name)
            .map((emp) => ({
                id: emp.id,
                name: emp.name,
            }));
    }, [allEmployees]);

    // Validation
    const isNameValid = name.trim().length > 0;
    const isManagerValid = managerId.trim().length > 0;
    const canSave = isNameValid && isManagerValid && !isReadOnly;

    // Filter employees added to the category
    const filteredEmployees = useMemo(() => {
        const query = employeeSearch.toLowerCase().trim();
        if (!query) return selectedEmployees;
        return selectedEmployees.filter(
            (emp) =>
                (emp.name ?? "").toLowerCase().includes(query) ||
                (emp.id ?? "").toLowerCase().includes(query) ||
                (emp.role ?? "").toLowerCase().includes(query)
        );
    }, [selectedEmployees, employeeSearch]);

    // Filter files added to the category
    const filteredFiles = useMemo(() => {
        const query = fileSearch.toLowerCase().trim();
        if (!query) return selectedFiles;
        return selectedFiles.filter((f) => f.name.toLowerCase().includes(query));
    }, [selectedFiles, fileSearch]);

    // Pagination for employees tab
    const empTotal = filteredEmployees.length;
    const empTotalPages = Math.ceil(empTotal / rowsPerPage) || 1;
    const empStartIdx = (empPage - 1) * rowsPerPage;
    const empEndIdx = Math.min(empStartIdx + rowsPerPage, empTotal);
    const paginatedEmployees = useMemo(() => {
        return filteredEmployees.slice(empStartIdx, empEndIdx);
    }, [filteredEmployees, empStartIdx, empEndIdx]);

    // Pagination for files tab
    const fileTotal = filteredFiles.length;
    const fileTotalPages = Math.ceil(fileTotal / rowsPerPage) || 1;
    const fileStartIdx = (filePage - 1) * rowsPerPage;
    const fileEndIdx = Math.min(fileStartIdx + rowsPerPage, fileTotal);
    const paginatedFiles = useMemo(() => {
        return filteredFiles.slice(fileStartIdx, fileEndIdx);
    }, [filteredFiles, fileStartIdx, fileEndIdx]);

    // Get list of employees in organization that are NOT currently added
    const unselectedEmployees = useMemo(() => {
        const selectedIds = new Set(selectedEmployees.map((e) => e.id));
        return allEmployees.filter((emp) => !selectedIds.has(emp.id));
    }, [allEmployees, selectedEmployees]);

    // Dynamic pool of files available in KNB to associate
    const availableFilesPool = useMemo(() => {
        const selectedFileNames = new Set(selectedFiles.map((f) => f.name));
        return allFiles.filter((f) => !selectedFileNames.has(f.name));
    }, [selectedFiles, allFiles]);

    // Handlers
    const handleAddMultipleEmployees = (emps: any[]) => {
        const newEmps = emps
            .filter((emp) => !selectedEmployees.some((e) => e.id === emp.id))
            .map((emp) => ({
                id: emp.id,
                name: emp.name,
                role: emp.role || "Member",
                avatar: emp.avatar || "",
            }));

        if (newEmps.length > 0) {
            setSelectedEmployees((prev) => [...prev, ...newEmps]);
            setEmpPage(1);
        }
    };

    const handleAddMultipleFiles = (files: any[]) => {
        const newFiles = files
            .filter((file) => !selectedFiles.some((f) => f.id === file.id))
            .map((file) => ({
                id: file.id,
                name: file.name,
                size: file.size || "0 B",
                mimeType: file.mimeType || file.type || "application/octet-stream",
            }));

        if (newFiles.length > 0) {
            setSelectedFiles((prev) => [...prev, ...newFiles]);
            setFilePage(1);
        }
    };


    const handleRemoveEmployee = (id: string) => {
        setSelectedEmployees((prev) => prev.filter((emp) => emp.id !== id));
        if (filteredEmployees.length - 1 <= empStartIdx && empPage > 1) {
            setEmpPage((p) => p - 1);
        }
    };

    const handleRemoveFile = (id: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
        if (filteredFiles.length - 1 <= fileStartIdx && filePage > 1) {
            setFilePage((p) => p - 1);
        }
    };

    const handleSave = async () => {
        if (!canSave || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const selectedManager = managerOptions.find((m) => m.id === managerId);

            const newCategory: Category = {
                id: category?.id || `CAT-${Date.now()}`,
                name: name.trim(),
                description: description.trim(),
                managerId,
                managerName: selectedManager ? selectedManager.name : "Unassigned",
                kbCount: selectedFiles.length,
                employeeCount: selectedEmployees.length,
                employees: selectedEmployees,
                files: selectedFiles,
                type: category?.type || "Department",
                createdBy: category?.createdBy || "Admin",
                createdDate: category?.createdDate || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                isArchived: category?.isArchived ?? false,
            };

            await onSubmit(newCategory);
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to save category:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[1000px] bg-[#FEFFFA] dark:bg-zinc-900"
                hideClose
                data-testid="team-drawer"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 shrink-0 select-none">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-md p-1.5 -ml-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            data-testid="close-team-drawer-btn"
                            aria-label="Close drawer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SheetTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {mode === "add" ? "Add Category" : mode === "edit" ? "Edit Category" : "Category Details"}
                        </SheetTitle>
                    </div>
                </div>

                {/* Split Content Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

                    {/* LEFT PANEL: Form parameters */}
                    <div className="w-full md:w-1/2 border-r border-zinc-150 dark:border-zinc-800 p-8 space-y-6 overflow-y-auto min-h-0 bg-[#FEFFFA] dark:bg-zinc-900">
                        {/* Category Name */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Category Name <span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <Input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setTouched((p) => ({ ...p, name: true }));
                                }}
                                onBlur={() => handleBlur("name")}
                                disabled={isReadOnly}
                                placeholder="Enter category name"
                                className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                data-testid="team-name-input"
                            />
                            {touched.name && !isNameValid && (
                                <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Category name is required.</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Description
                            </Label>
                            <div className="relative">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                                    disabled={isReadOnly}
                                    placeholder="Enter category description"
                                    rows={6}
                                    className="rounded-lg border-zinc-200 dark:border-zinc-700 bg-[#FEFFFA] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none leading-relaxed pr-16"
                                    data-testid="category-description-input"
                                />
                                <span className={cn(
                                    "absolute bottom-3 right-3 text-xs font-semibold bg-[#FEFFFA]/85 dark:bg-zinc-800/85 px-1.5 py-0.5 rounded select-none transition-colors",
                                    description.length === 500
                                        ? "text-red-650 dark:text-red-400 font-bold"
                                        : "text-zinc-400 dark:text-zinc-500"
                                )}>
                                    {description.length}/500
                                </span>
                            </div>
                        </div>

                        {/* Manager */}
                        {!isMember && (
                            <div className="space-y-1.5 flex flex-col">
                                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Manager <span className="text-red-500 ml-0.5">*</span>
                                </Label>
                                <Popover open={managerOpen} onOpenChange={setManagerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={managerOpen}
                                            disabled={isReadOnly}
                                            className={cn("h-11 justify-between w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-normal hover:bg-zinc-50 dark:hover:bg-zinc-700",
                                                !managerId && "text-zinc-400"
                                            )}
                                        >
                                            {managerId
                                                ? managerOptions.find((m) => m.id === managerId)?.name
                                                : "Select manager..."}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-md">
                                        <div className="flex flex-col">
                                            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                                                <Input
                                                    value={managerSearch}
                                                    onChange={(e) => setManagerSearch(e.target.value)}
                                                    placeholder="Search manager..."
                                                    className="h-8 border-none focus-visible:ring-0 px-0 rounded-none shadow-none text-sm bg-transparent placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                                                />
                                            </div>
                                            <div className="max-h-56 overflow-y-auto py-1">
                                                {managerOptions.filter(m => (m.name ?? "").toLowerCase().includes(managerSearch.toLowerCase())).map((emp) => (
                                                    <div
                                                        key={emp.id}
                                                        className="px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between"
                                                        onClick={() => {
                                                            setManagerId(emp.id);
                                                            setManagerOpen(false);
                                                            setManagerSearch("");
                                                            setTouched((p) => ({ ...p, managerId: true }));
                                                        }}
                                                    >
                                                        {emp.name}
                                                    </div>
                                                ))}
                                                {managerOptions.filter(m => (m.name ?? "").toLowerCase().includes(managerSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-4 text-center text-sm text-zinc-500">
                                                        No results found.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {touched.managerId && !isManagerValid && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Please select a manager.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: Files and Employees Tabs with Lists */}
                    <div className="w-full md:w-1/2 flex flex-col bg-[#FEFFFA] dark:bg-zinc-900 min-h-0">
                        {/* Tabs Bar */}
                        <div className="flex items-center justify-between px-8 py-4 shrink-0 select-none bg-[#FEFFFA] dark:bg-zinc-900">
                            <div className="flex bg-zinc-100/80 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50" role="tablist">
                                <button
                                    type="button"
                                    id="tab-files-btn"
                                    role="tab"
                                    aria-selected={activeTab === "files"}
                                    aria-controls="files-panel"
                                    onClick={() => setActiveTab("files")}
                                    onKeyDown={(e) => {
                                        if (e.key === "ArrowRight" && !isMember) {
                                            setActiveTab("employees");
                                            document.getElementById("tab-employees-btn")?.focus();
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                                        activeTab === "files"
                                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50"
                                    )}
                                    data-testid="tab-files-btn"
                                >
                                    Files
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded font-mono font-medium scale-90",
                                        activeTab === "files" ? "bg-blue-100 dark:bg-blue-900/60" : "bg-zinc-200 dark:bg-zinc-800"
                                    )}>
                                        {selectedFiles.length}
                                    </span>
                                </button>
                                {!isMember && (
                                    <button
                                        type="button"
                                        id="tab-employees-btn"
                                        role="tab"
                                        aria-selected={activeTab === "employees"}
                                        aria-controls="employees-panel"
                                        onClick={() => setActiveTab("employees")}
                                        onKeyDown={(e) => {
                                            if (e.key === "ArrowLeft") {
                                                setActiveTab("files");
                                                document.getElementById("tab-files-btn")?.focus();
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                                            activeTab === "employees"
                                                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs"
                                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50"
                                        )}
                                        data-testid="tab-employees-btn"
                                    >
                                        Employees
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded font-mono font-medium scale-90",
                                            activeTab === "employees" ? "bg-blue-100 dark:bg-blue-900/60" : "bg-zinc-200 dark:bg-zinc-800"
                                        )}>
                                            {selectedEmployees.length}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Add Item button */}
                            {!isReadOnly && (
                                <div className="flex">
                                    {activeTab === "employees" ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-1 rounded-lg text-xs font-semibold shadow-xs"
                                            data-testid="add-employee-trigger-btn"
                                            onClick={() => setAddEmployeesOpen(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-1 rounded-lg text-xs font-semibold shadow-xs"
                                            data-testid="add-file-trigger-btn"
                                            onClick={() => setAddFilesOpen(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Search Sub-Header inside Drawer tabs */}
                        <div className="px-8 py-3 bg-[#FEFFFA] dark:bg-zinc-900 shrink-0">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <Input
                                    value={activeTab === "employees" && !isMember ? employeeSearch : fileSearch}
                                    onChange={(e) => {
                                        if (activeTab === "employees" && !isMember) {
                                            setEmployeeSearch(e.target.value);
                                            setEmpPage(1);
                                        } else {
                                            setFileSearch(e.target.value);
                                            setFilePage(1);
                                        }
                                    }}
                                    placeholder={
                                        activeTab === "employees" && !isMember
                                            ? "Search Employee Name..."
                                            : "Search File Name."
                                    }
                                    className="h-9 w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 pl-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-blue-500/20"
                                    data-testid="drawer-search-input"
                                />
                            </div>
                        </div>

                        {/* Active list container */}
                        <div className="flex-1 overflow-y-auto bg-[#FEFFFA] dark:bg-zinc-900 min-h-0 flex flex-col" role="tabpanel" id={activeTab === "employees" && !isMember ? "employees-panel" : "files-panel"} aria-labelledby={activeTab === "employees" && !isMember ? "tab-employees-btn" : "tab-files-btn"}>
                            {activeTab === "employees" && !isMember ? (
                                paginatedEmployees.length === 0 ? (
                                    /* Employees Empty State */
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FEFFFA] dark:bg-zinc-900">
                                        <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            No Data Found
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-405 mt-1 max-w-[240px] leading-relaxed">
                                            No employees have been added yet.
                                        </p>
                                    </div>
                                ) : (
                                    /* Employees Table List */
                                    <div className="flex-1 bg-[#FEFFFA] dark:bg-zinc-900 flex flex-col justify-between">
                                        <div className="w-full pb-4">
                                            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 mx-8 mb-2">
                                                {!isReadOnly && <Checkbox checked={false} disabled className="border-zinc-300 dark:border-zinc-600 shadow-none" />}
                                                <span>Employee Name</span>
                                            </div>
                                            <div className="flex flex-col">
                                                {paginatedEmployees.map((emp) => (
                                                    <div
                                                        key={emp.id}
                                                        className="flex items-center justify-between px-4 py-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-lg mx-8 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            {!isReadOnly && <Checkbox checked={false} disabled className="border-zinc-300 dark:border-zinc-600 shadow-none" />}
                                                            <div className="relative">
                                                                <Avatar className="h-9 w-9 shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                                                    <AvatarImage src={emp.avatar} />
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {emp.name[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-zinc-700 dark:bg-zinc-300 border-2 border-white dark:border-zinc-900 rounded-full" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                                    {emp.name}
                                                                </span>
                                                                <span className="text-[11px] text-zinc-505 dark:text-zinc-450 truncate mt-0.5 max-w-[200px]">
                                                                    {emp.role}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {!isReadOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveEmployee(emp.id)}
                                                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-4 shrink-0 transition-colors"
                                                                title="Remove employee"
                                                                aria-label={`Remove employee ${emp.name}`}
                                                            >
                                                                <MinusCircle className="h-5 w-5" strokeWidth={1.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                paginatedFiles.length === 0 ? (
                                    /* Files Empty State */
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FEFFFA] dark:bg-zinc-900">
                                        <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-505 mb-4 animate-pulse">
                                            <FileText className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            No Data Found
                                        </h3>
                                        <p className="text-xs text-zinc-505 dark:text-zinc-405 mt-1 max-w-[240px] leading-relaxed">
                                            No files have been added yet.
                                        </p>
                                    </div>
                                ) : (
                                    /* Files Table List */
                                    <div className="flex-1 bg-[#FEFFFA] dark:bg-zinc-900 flex flex-col justify-between">
                                        <div className="w-full pb-4">
                                            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 mx-8 mb-2">
                                                {!isReadOnly && <Checkbox checked={false} disabled className="border-zinc-300 dark:border-zinc-600 shadow-none" />}
                                                <span>File Name</span>
                                            </div>
                                            <div className="flex flex-col">
                                                {paginatedFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center justify-between px-4 py-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-lg mx-8 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            {!isReadOnly && <Checkbox checked={false} disabled className="border-zinc-300 dark:border-zinc-600 shadow-none" />}
                                                            <div className="h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-500">
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                                    {file.name}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-zinc-505 dark:text-zinc-450 truncate mt-0.5">
                                                                    {file.size}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {!isReadOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFile(file.id)}
                                                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-4 shrink-0 transition-colors"
                                                                title="Remove file"
                                                                aria-label={`Remove file ${file.name}`}
                                                            >
                                                                <MinusCircle className="h-5 w-5" strokeWidth={1.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Pagination Footer inside drawer tabs */}
                        {activeTab === "employees" && !isMember && empTotal > 0 && (
                            <div className="px-8 py-3 bg-[#FEFFFA] dark:bg-zinc-900 flex items-center justify-between text-xs text-zinc-555 select-none shrink-0">
                                <div className="flex items-center gap-1">
                                    <span>Rows per Page:</span>
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">50</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span>
                                        {empStartIdx + 1}-{empEndIdx} of {empTotal}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={empPage === 1}
                                            onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="h-5 w-5 flex items-center justify-center rounded font-semibold text-zinc-800 dark:text-zinc-100">
                                            {empPage}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={empPage === empTotalPages}
                                            onClick={() => setEmpPage((p) => Math.min(empTotalPages, p + 1))}
                                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "files" && fileTotal > 0 && (
                            <div className="px-8 py-3 bg-[#FEFFFA] dark:bg-zinc-900 flex items-center justify-between text-xs text-zinc-555 select-none shrink-0">
                                <div className="flex items-center gap-1">
                                    <span>Rows per Page:</span>
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">50</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span>
                                        {fileStartIdx + 1}-{fileEndIdx} of {fileTotal}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={filePage === 1}
                                            onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="h-5 w-5 flex items-center justify-center rounded font-semibold text-zinc-800 dark:text-zinc-100">
                                            {filePage}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={filePage === fileTotalPages}
                                            onClick={() => setFilePage((p) => Math.min(fileTotalPages, p + 1))}
                                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer buttons */}
                {!isReadOnly && (
                    <div className="flex items-center justify-end gap-3 bg-[#FEFFFA] dark:bg-zinc-900 px-8 py-4 shrink-0 select-none">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 text-sm font-semibold h-10 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!canSave || isSubmitting}
                            onClick={handleSave}
                            data-testid="save-team-btn"
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-6 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>
                )}
            </SheetContent>

            {/* Sub-Dialogs mounted outside the sheet content to avoid z-index and portal nesting issues */}
            <AddEmployeesDialog
                open={addEmployeesOpen}
                onOpenChange={setAddEmployeesOpen}
                unselectedEmployees={unselectedEmployees}
                onAdd={handleAddMultipleEmployees}
            />
            <AddFilesDialog
                open={addFilesOpen}
                onOpenChange={setAddFilesOpen}
                unselectedFiles={availableFilesPool}
                onAdd={handleAddMultipleFiles}
            />
        </Sheet>
    );
}
