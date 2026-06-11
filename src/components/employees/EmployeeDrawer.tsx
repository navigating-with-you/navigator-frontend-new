import React, { useEffect, useState } from "react";
import { X, FileText, MessageSquare, MessagesSquare, Pencil, AlertCircle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/PermissionGate";
import { PERMISSIONS } from "@/utils/rbacConfig";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listRoles, changeEmployeeRole, updateEmployeeDetails } from "@/lib/api";
import { toast } from "sonner";
import { employeeEditSchema } from "@/schemas/employee";
import { EMPLOYEE_CODE_CONSTRAINTS } from "@/utils/employeeCodeValidation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import type { Employee } from "@/types/employee";

type FieldProps = {
    label: string;
    value?: string | number | null;
    testId?: string;
};

function Field({ label, value, testId }: FieldProps) {
    return (
        <div>
            <div className="text-xs text-zinc-505 dark:text-zinc-500">{label}</div>
            <div
                className="mt-1 text-sm font-normal text-zinc-900 dark:text-zinc-100"
                data-testid={testId}
            >
                {value || "-"}
            </div>
        </div>
    );
}

type UsageCardProps = {
    icon: React.ElementType;
    label: string;
    value: string | number;
};

function UsageCard({ icon: Icon, label, value }: UsageCardProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-400" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-sm font-normal text-zinc-900 dark:text-zinc-100">{value}</div>
            </div>
        </div>
    );
}

type EmployeeDetailsDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    initialEditMode?: boolean;
    onSave?: (updated: Employee) => void;
    currentUserRole?: string;
    superAdminExists?: boolean;
    currentUserId?: string;
};

export default function EmployeeDetailsDrawer({
    open,
    onOpenChange,
    employee,
    initialEditMode = false,
    onSave,
    currentUserRole,
    superAdminExists,
    currentUserId,
}: EmployeeDetailsDrawerProps) {
    const { getToken } = useKindeAuth();
    
    // Mode states
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form field states
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [roleName, setRoleName] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");
    
    // Dropdown options
    const [roles, setRoles] = useState<{ id: string; name: string; description?: string }[]>([]);
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    // Reset or populate states when drawer open or employee changes
    useEffect(() => {
        if (!open || !employee) return;
        
        setIsEditing(initialEditMode);
        
        // Parse employee name into first and last name
        const names = (employee.name || "").trim().split(" ");
        setFirstName(names[0] || "");
        setLastName(names.slice(1).join(" ") || "");
        setEmail(employee.email || "");
        setRoleName(employee.role || "");
        setEmployeeCode(employee.employeeCode || "");
        setTouched({});

        const fetchRolesData = async () => {
            try {
                const token = await getToken();
                if (token) {
                    const rolesData = await listRoles(token).catch(() => []);
                    setRoles(Array.isArray(rolesData) ? rolesData : []);
                }
            } catch (err) {
                console.error("Failed to load roles:", err);
            }
        };
        fetchRolesData();
    }, [open, employee, initialEditMode, getToken]);

    if (!employee) return null;

    // Validation
    const validation = employeeEditSchema.safeParse({ firstName, lastName, email, employeeCode });
    const canSave = validation.success;
    const fieldErrors = !validation.success ? validation.error.flatten().fieldErrors : {};

    // Role filtering
    const isTargetSuperAdmin = (employee?.role || "").toLowerCase().replace(/\s+/g, "_") === "super_admin";
    const isCurrentUserSuperAdmin = (currentUserRole || "").toLowerCase().replace(/\s+/g, "_") === "super_admin";

    let baseRoles = roles.length > 0 ? roles : [
        { id: "admin", name: "admin" },
        { id: "editor", name: "editor" },
        { id: "member", name: "member" }
    ];

    // Super Admin role is not changeable - never show it for role selection unless just for display
    const displayRoles = baseRoles.filter((r) => {
        const name = (r.name || "").toLowerCase();
        // Completely hide Super Admin from the role dropdown
        if (name === "super_admin") {
            return false;
        }
        return ["admin", "member", "editor"].includes(name);
    });

    const handleSave = async () => {
        if (!canSave || isSaving) return;

        try {
            setIsSaving(true);
            const token = await getToken();
            if (!token) {
                toast.error("You must be logged in to edit employees");
                return;
            }

            // Update Role if changed
            if (roleName !== employee.role) {
                const normalizedRole = roleName.toLowerCase().replace(" ", "_");
                await changeEmployeeRole(employee.id, normalizedRole, token);
            }

            // Update details if changed
            const newFullName = `${firstName} ${lastName}`.trim();
            const oldFullName = employee.name || "";
            const hasNameChange = newFullName !== oldFullName;
            const hasEmployeeCodeChange = (employeeCode || null) !== (employee.employeeCode || null);

            if (hasNameChange || hasEmployeeCodeChange) {
                await updateEmployeeDetails(
                    employee.id,
                    {
                        first_name: firstName,
                        last_name: lastName,
                        employee_code: employeeCode || null,
                    },
                    token
                );
            }

            const updatedEmployee: Employee = {
                ...employee,
                name: newFullName,
                email,
                role: roleName,
                employeeCode: employeeCode || null,
            };

            toast.success("Employee updated successfully!");
            onSave?.(updatedEmployee);
            setIsEditing(false);
        } catch (error: any) {
            console.error("Save employee details error:", error);
            toast.error(error.message || "Failed to update employee");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        const names = (employee.name || "").split(" ");
        setFirstName(names[0] || "");
        setLastName(names.slice(1).join(" ") || "");
        setEmail(employee.email || "");
        setRoleName(employee.role || "");
        setEmployeeCode(employee.employeeCode || "");
        setIsEditing(false);
    };

    const isSelf = currentUserId === employee.id;
    const canEdit = (!isTargetSuperAdmin || isCurrentUserSuperAdmin);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl h-full z-50 animate-in slide-in-from-right duration-250"
                data-testid="employee-details-drawer"
            >
                {/* Loader Overlay when saving */}
                {isSaving && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 z-50 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-zinc-650 dark:text-zinc-400">Saving changes...</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-5 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (isEditing) {
                                    handleCancel();
                                } else {
                                    onOpenChange(false);
                                }
                            }}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800"
                            data-testid="close-details-drawer-btn"
                            tabIndex={-1}
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SheetTitle className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                            {isEditing ? "Edit Employee" : "Employee Details"}
                        </SheetTitle>
                    </div>
                    
                    {!isEditing && canEdit && (
                        <PermissionGate permission={PERMISSIONS.EMPLOYEE_EDIT} fallback={null}>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1.5 bg-[#1A56DB] hover:bg-blue-750 text-white px-3.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                            </button>
                        </PermissionGate>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {/* Avatar */}
                    <div>
                        <div className="text-xs text-zinc-500">Employee Avatar</div>
                        <div className="mt-2">
                            <Avatar className="h-28 w-28 rounded-2xl">
                                <AvatarImage
                                    src={employee.avatar}
                                    alt={employee.name}
                                    className="object-cover"
                                />
                                <AvatarFallback className="rounded-2xl text-lg">
                                    {firstName
                                        ? `${firstName[0] || ""}${lastName[0] || ""}`
                                        : "EMP"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {!isEditing ? (
                        /* VIEW DETAILS MODE */
                        <>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <Field
                                    label="First Name"
                                    value={employee.name?.split(" ")[0] || "-"}
                                    testId="details-first-name"
                                />
                                <Field
                                    label="Last Name"
                                    value={employee.name?.split(" ").slice(1).join(" ") || "-"}
                                    testId="details-last-name"
                                />
                                <Field
                                    label="Email"
                                    value={employee.email}
                                    testId="details-email"
                                />
                                <Field 
                                    label="Role" 
                                    value={employee.role} 
                                    testId="details-role" 
                                />
                                <Field
                                    label="Employee Code"
                                    value={employee.employeeCode || "-"}
                                    testId="details-employee-code"
                                />
                                <Field
                                    label="Categories"
                                    value={employee.category || "-"}
                                    testId="details-categories"
                                />
                                <Field
                                    label="Created By"
                                    value={employee.createdBy}
                                    testId="details-created-by"
                                />
                                <Field
                                    label="Created Date"
                                    value={employee.createdDate}
                                    testId="details-created-date"
                                />
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800" />

                            {/* Usage */}
                            <div>
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Usage</div>
                                <div className="mt-3 space-y-3">
                                    <UsageCard
                                        icon={FileText}
                                        label="No. Of KB Files"
                                        value={employee.kbFiles !== undefined && employee.kbFiles !== null ? employee.kbFiles : "-"}
                                    />
                                    <UsageCard
                                        icon={MessageSquare}
                                        label="Simple Interaction"
                                        value={employee.simpleInteraction !== undefined && employee.simpleInteraction !== null ? employee.simpleInteraction : "-"}
                                    />
                                    <UsageCard
                                        icon={MessagesSquare}
                                        label="Complex Interaction"
                                        value={employee.complexInteraction !== undefined && employee.complexInteraction !== null ? employee.complexInteraction : "-"}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        /* EDIT MODE */
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                {/* First Name */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-first-name" className="text-xs font-semibold text-zinc-500">
                                        First Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-first-name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                                        placeholder="First Name"
                                        maxLength={50}
                                        className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-600 shadow-none"
                                    />
                                    {touched.firstName && fieldErrors.firstName && (
                                        <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>{fieldErrors.firstName[0]}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Last Name */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-last-name" className="text-xs font-semibold text-zinc-500">
                                        Last Name <span className="text-xs text-zinc-400 font-normal">(optional)</span>
                                    </Label>
                                    <Input
                                        id="edit-last-name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                                        placeholder="Last Name"
                                        maxLength={50}
                                        className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-600 shadow-none"
                                    />
                                    {touched.lastName && fieldErrors.lastName && (
                                        <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>{fieldErrors.lastName[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-email" className="text-xs font-semibold text-zinc-500">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                                    placeholder="Email address"
                                    maxLength={255}
                                    disabled={employee.isActive !== false}
                                    className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-[#F9FAFB] dark:bg-zinc-850 text-zinc-500 dark:text-zinc-500 px-3.5 cursor-not-allowed shadow-none disabled:opacity-100"
                                />
                                {touched.email && fieldErrors.email && (
                                    <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>{fieldErrors.email[0]}</span>
                                    </div>
                                )}
                            </div>

                            {/* Role */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zinc-500">Role</Label>
                                <Select 
                                    value={(roleName || "").toLowerCase().replace(/\s+/g, "_")} 
                                    onValueChange={(val) => {
                                        const displayVal = val === "super_admin"
                                            ? "Super Admin"
                                            : val.charAt(0).toUpperCase() + val.slice(1);
                                        setRoleName(displayVal);
                                    }} 
                                    disabled={isSelf || isTargetSuperAdmin}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 shadow-none px-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                        {displayRoles.map((r) => {
                                            const backendRoleName = (r.name || "").toLowerCase().replace(/\s+/g, "_");
                                            const displayRole = r.name === "super_admin"
                                                ? "Super Admin"
                                                : r.name.charAt(0).toUpperCase() + r.name.slice(1);
                                            return (
                                                <SelectItem key={r.id} value={backendRoleName} className="dark:text-zinc-250 dark:focus:bg-zinc-700">
                                                    {displayRole}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {isTargetSuperAdmin && (
                                    <div className="text-zinc-450 text-[10px] text-amber-600 dark:text-amber-500">
                                        Super Admin role cannot be changed
                                    </div>
                                )}
                            </div>

                            {/* Employee Code */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-employee-code" className="text-xs font-semibold text-zinc-500">
                                    Employee Code <span className="text-xs text-zinc-400 font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="edit-employee-code"
                                    value={employeeCode}
                                    onChange={(e) => setEmployeeCode(e.target.value)}
                                    onBlur={() => setTouched(t => ({ ...t, employeeCode: true }))}
                                    placeholder="e.g., EMP-001, john-doe"
                                    maxLength={50}
                                    className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 focus-visible:ring-1 focus-visible:ring-blue-600 shadow-none"
                                />
                                {touched.employeeCode && fieldErrors.employeeCode && (
                                    <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>{fieldErrors.employeeCode[0]}</span>
                                    </div>
                                )}
                                {!touched.employeeCode && (
                                    <div className="text-zinc-450 text-[10px]">
                                        {EMPLOYEE_CODE_CONSTRAINTS.MIN_LENGTH}-{EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH} characters, alphanumeric, hyphens, underscores, dots
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Only in Edit Mode) */}
                {isEditing && (
                    <div className="flex items-center justify-end px-6 py-4 shrink-0 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[#1A56DB] hover:text-blue-750 font-semibold text-sm transition-colors cursor-pointer mr-6"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSave}
                            disabled={!canSave || isSaving}
                            className="rounded-lg bg-[#1A56DB] hover:bg-blue-750 text-white font-semibold text-sm px-6 py-2.5 cursor-pointer shadow-none h-10"
                        >
                            Save
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}