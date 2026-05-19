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
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { type Category, type CategoryEmployee, type CategoryFile } from "@/types/category";
import { cn } from "@/lib/utils";
import AddEmployeesDialog from "./AddEmployeesDialog";

interface CategoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (category: Category) => void;
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

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [managerId, setManagerId] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState<CategoryEmployee[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<CategoryFile[]>([]);

    // UI state
    const [activeTab, setActiveTab] = useState<"files" | "employees">("employees");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [fileSearch, setFileSearch] = useState("");
    const [addEmployeesOpen, setAddEmployeesOpen] = useState(false);
    const [empPage, setEmpPage] = useState(1);
    const [filePage, setFilePage] = useState(1);
    const [rowsPerPage] = useState(50);
    const [touched, setTouched] = useState<{ name?: boolean; managerId?: boolean }>({});

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
            setActiveTab("employees");
            setEmployeeSearch("");
            setFileSearch("");
            setEmpPage(1);
            setFilePage(1);
        }
    }, [open, category, mode]);

    const handleBlur = (field: "name" | "managerId") => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    // Filter available managers (all employees list)
    const managerOptions = useMemo(() => {
        return allEmployees.map((emp) => ({
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
                emp.name.toLowerCase().includes(query) ||
                emp.id.toLowerCase().includes(query) ||
                emp.role.toLowerCase().includes(query)
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


    const handleRemoveEmployee = (id: string) => {
        setSelectedEmployees((prev) => prev.filter((emp) => emp.id !== id));
        if (filteredEmployees.length - 1 <= empStartIdx && empPage > 1) {
            setEmpPage((p) => p - 1);
        }
    };

    const handleAddFile = (file: CategoryFile) => {
        setSelectedFiles((prev) => [...prev, file]);
        setFilePage(1);
    };

    const handleRemoveFile = (id: string) => {
        setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
        if (filteredFiles.length - 1 <= fileStartIdx && filePage > 1) {
            setFilePage((p) => p - 1);
        }
    };

    const handleSave = () => {
        if (!canSave) return;

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
            createdBy: category?.createdBy || "William Jones",
            createdDate: category?.createdDate || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            isArchived: category?.isArchived ?? false,
        };

        onSubmit(newCategory);
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[1000px] bg-white dark:bg-zinc-900 border-l border-zinc-150 dark:border-zinc-800"
                hideClose
                data-testid="team-drawer"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-8 py-5 shrink-0 select-none">
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
                            {mode === "add" ? "Add Team" : mode === "edit" ? "Edit Team" : "Team Details"}
                        </SheetTitle>
                    </div>
                </div>

                {/* Split Content Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    
                    {/* LEFT PANEL: Form parameters */}
                    <div className="w-full md:w-1/2 border-r border-zinc-150 dark:border-zinc-800 p-8 space-y-6 overflow-y-auto min-h-0 bg-white dark:bg-zinc-900">
                        {/* Category Name */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Team Name <span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <Input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setTouched((p) => ({ ...p, name: true }));
                                }}
                                onBlur={() => handleBlur("name")}
                                disabled={isReadOnly}
                                placeholder="Enter team name"
                                className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                data-testid="team-name-input"
                            />
                            {touched.name && !isNameValid && (
                                <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Team name is required.</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Description
                                </Label>
                                <span className="text-xs text-zinc-400 font-medium">
                                    {description.length}/500
                                </span>
                            </div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                                disabled={isReadOnly}
                                placeholder="Enter team description"
                                rows={6}
                                className="rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none leading-relaxed"
                                data-testid="category-description-input"
                            />
                        </div>

                        {/* Manager */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Manager <span className="text-red-500 ml-0.5">*</span>
                            </Label>
                            <Select
                                value={managerId}
                                onValueChange={(v) => {
                                    setManagerId(v);
                                    setTouched((p) => ({ ...p, managerId: true }));
                                }}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                    data-testid="team-manager-select"
                                >
                                    <SelectValue placeholder="Select manager from the employee list" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 max-h-56">
                                    {managerOptions.map((emp) => (
                                        <SelectItem
                                            key={emp.id}
                                            value={emp.id}
                                            className="text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-700 cursor-pointer"
                                        >
                                            {emp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {touched.managerId && !isManagerValid && (
                                <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Please select a manager.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Files and Employees Tabs with Lists */}
                    <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-zinc-900 min-h-0">
                        {/* Tabs Bar */}
                        <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 px-8 py-4 shrink-0 select-none bg-white dark:bg-zinc-900">
                            <div className="flex bg-zinc-100/80 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("files")}
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
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 gap-1 rounded-lg text-xs font-semibold shadow-xs"
                                                    data-testid="add-file-trigger-btn"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="w-64 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-h-64 overflow-y-auto"
                                            >
                                                {availableFilesPool.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                                                        No new files available
                                                    </div>
                                                ) : (
                                                    availableFilesPool.map((f) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={f.id}
                                                            checked={false}
                                                            onCheckedChange={() => handleAddFile(f)}
                                                            className="text-xs cursor-pointer truncate max-w-[240px]"
                                                        >
                                                            <span className="truncate">{f.name}</span>
                                                        </DropdownMenuCheckboxItem>
                                                    ))
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Search Sub-Header inside Drawer tabs */}
                        <div className="px-8 py-3 bg-white dark:bg-zinc-900 shrink-0">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <Input
                                    value={activeTab === "employees" ? employeeSearch : fileSearch}
                                    onChange={(e) => {
                                        if (activeTab === "employees") {
                                            setEmployeeSearch(e.target.value);
                                            setEmpPage(1);
                                        } else {
                                            setFileSearch(e.target.value);
                                            setFilePage(1);
                                        }
                                    }}
                                    placeholder={
                                        activeTab === "employees"
                                            ? "Search Employee Name or ID."
                                            : "Search File Name."
                                    }
                                    className="h-9 w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 pl-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-blue-500/20"
                                    data-testid="drawer-search-input"
                                />
                            </div>
                        </div>

                        {/* Active list container */}
                        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 min-h-0 flex flex-col">
                            {activeTab === "employees" ? (
                                paginatedEmployees.length === 0 ? (
                                    /* Employees Empty State */
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-900">
                                        <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            No Data Found
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px] leading-relaxed">
                                            No employees have been added yet.
                                        </p>
                                    </div>
                                ) : (
                                    /* Employees Table List */
                                    <div className="flex-1 bg-white dark:bg-zinc-900 flex flex-col justify-between">
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
                                                                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                                    {emp.name}
                                                                </span>
                                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-450 truncate mt-0.5 max-w-[200px]">
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
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-900">
                                        <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 animate-pulse">
                                            <FileText className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            No Data Found
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px] leading-relaxed">
                                            No files have been added yet.
                                        </p>
                                    </div>
                                ) : (
                                    /* Files Table List */
                                    <div className="flex-1 bg-white dark:bg-zinc-900 flex flex-col justify-between">
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
                                                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-450 truncate mt-0.5">
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
                        {activeTab === "employees" && empTotal > 0 && (
                            <div className="px-8 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 select-none shrink-0">
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
                                        <span className="h-5 w-5 flex items-center justify-center rounded font-semibold text-zinc-850 dark:text-zinc-100">
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
                            <div className="px-8 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 select-none shrink-0">
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
                                        <span className="h-5 w-5 flex items-center justify-center rounded font-semibold text-zinc-850 dark:text-zinc-100">
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
                <div className="flex items-center justify-end gap-3 border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-4 shrink-0 select-none">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        data-testid="cancel-team-btn"
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-semibold h-10 px-5"
                    >
                        {isReadOnly ? "Close" : "Cancel"}
                    </Button>
                    {!isReadOnly && (
                        <Button
                            disabled={!canSave}
                            onClick={handleSave}
                            data-testid="save-team-btn"
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-6 shadow-sm disabled:opacity-50"
                        >
                            Save
                        </Button>
                    )}
                </div>
            </SheetContent>

            {/* Sub-Dialogs mounted outside the sheet content to avoid z-index and portal nesting issues */}
            <AddEmployeesDialog
                open={addEmployeesOpen}
                onOpenChange={setAddEmployeesOpen}
                unselectedEmployees={unselectedEmployees}
                onAdd={handleAddMultipleEmployees}
            />
        </Sheet>
    );
}
