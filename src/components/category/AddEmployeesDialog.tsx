import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AddEmployeesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unselectedEmployees: any[];
    onAdd: (employees: any[]) => void;
}

export default function AddEmployeesDialog({
    open,
    onOpenChange,
    unselectedEmployees,
    onAdd,
}: AddEmployeesDialogProps) {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Reset state when opened
    React.useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedIds(new Set());
            setPage(1);
        }
    }, [open]);

    // Filter employees by search
    const filteredEmployees = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return unselectedEmployees;
        return unselectedEmployees.filter(
            (emp) =>
                emp.name.toLowerCase().includes(query) ||
                emp.id.toLowerCase().includes(query) ||
                (emp.role && emp.role.toLowerCase().includes(query))
        );
    }, [unselectedEmployees, search]);

    // Pagination
    const total = filteredEmployees.length;
    const totalPages = Math.ceil(total / rowsPerPage) || 1;
    const startIdx = (page - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, total);
    
    const paginatedEmployees = useMemo(() => {
        return filteredEmployees.slice(startIdx, endIdx);
    }, [filteredEmployees, startIdx, endIdx]);

    // Handlers
    const toggleEmployee = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === paginatedEmployees.length && paginatedEmployees.length > 0) {
            // Deselect all on current page
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginatedEmployees.forEach((emp) => next.delete(emp.id));
                return next;
            });
        } else {
            // Select all on current page
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginatedEmployees.forEach((emp) => next.add(emp.id));
                return next;
            });
        }
    };

    const handleAdd = () => {
        const employeesToAdd = unselectedEmployees.filter((emp) => selectedIds.has(emp.id));
        onAdd(employeesToAdd);
        onOpenChange(false);
    };

    const allSelectedOnPage = paginatedEmployees.length > 0 && paginatedEmployees.every((emp) => selectedIds.has(emp.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[700px] p-0 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col h-[85vh] sm:h-[800px]">
                <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Add Employees to Team
                    </DialogTitle>
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
                                placeholder="Search Employee Name..."
                                className="h-10 w-full rounded-lg border-zinc-200 dark:border-zinc-700 pl-10 text-sm focus:ring-blue-500/20"
                            />
                        </div>

                        {/* List Count Badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Employees list
                            </span>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-50 rounded text-xs font-semibold px-2">
                                {total}
                            </Badge>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-auto flex flex-col px-6">
                        {/* Table Header */}
                        <div className="sticky top-0 z-10 flex items-center gap-4 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-100 dark:border-zinc-800 rounded-t-lg px-4 py-3 shrink-0">
                            <Checkbox 
                                checked={allSelectedOnPage}
                                onCheckedChange={toggleAll}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                Employee Name
                            </span>
                        </div>

                        {/* Table Body */}
                        <div className="border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-lg divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {paginatedEmployees.length === 0 ? (
                                <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    No employees found.
                                </div>
                            ) : (
                                paginatedEmployees.map((emp) => (
                                    <div key={emp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <Checkbox 
                                            checked={selectedIds.has(emp.id)}
                                            onCheckedChange={() => toggleEmployee(emp.id)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative">
                                                <Avatar className="h-9 w-9 border border-zinc-200 dark:border-zinc-700 shrink-0">
                                                    <AvatarImage src={emp.avatar} />
                                                    <AvatarFallback className="text-xs">{emp.name[0]}</AvatarFallback>
                                                </Avatar>
                                                {/* Status dot (green for active) */}
                                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-950 bg-green-500"></span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                    {emp.name}
                                                </span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                    {emp.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls (Pagination & Actions) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 gap-4">
                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <span>Rows per Page</span>
                            <Select
                                value={rowsPerPage.toString()}
                                onValueChange={(v) => {
                                    setRowsPerPage(Number(v));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-7 w-[60px] text-xs bg-zinc-50 dark:bg-zinc-900 border-none">
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
                        <div className="flex items-center gap-4">
                            <span>{total > 0 ? startIdx + 1 : 0}-{endIdx} of {total}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="h-6 w-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100">
                                    {page}
                                </span>
                                <button
                                    type="button"
                                    disabled={page === totalPages || total === 0}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 text-sm font-semibold h-9 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-6 text-sm font-semibold disabled:opacity-50"
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
