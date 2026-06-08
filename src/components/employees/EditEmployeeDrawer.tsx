import { useEffect, useState, type JSX } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { employeeEditSchema } from "@/schemas/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listRoles, changeEmployeeRole, updateEmployeeDetails } from "@/lib/api";
import { toast } from "sonner";
import type { Employee } from "@/types/employee";
import { EMPLOYEE_CODE_CONSTRAINTS } from "@/utils/employeeCodeValidation";

interface EditEmployeeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onSave: (updated: Employee) => void;
    currentUserRole?: string;
    superAdminExists?: boolean;
    currentUserId?: string;
}

export default function EditEmployeeDrawer({
    open,
    onOpenChange,
    employee,
    onSave,
    currentUserRole,
    superAdminExists,
    currentUserId,
}: EditEmployeeDrawerProps): JSX.Element {
    const { getToken } = useKindeAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [roleName, setRoleName] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");

    const [roles, setRoles] = useState<{ id: string; name: string; description?: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    // Fetch roles when drawer opens
    useEffect(() => {
        if (!open || !employee) return;

        // Initialize state from employee
        const names = employee.name.split(" ");
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
    }, [open, employee]);

    if (!employee) return <></>;

    const validation = employeeEditSchema.safeParse({ firstName, lastName, email });
    const canSave = validation.success;
    const fieldErrors = !validation.success
        ? validation.error.flatten().fieldErrors
        : {};

    // Filter roles and only allow Super Admin option when permitted
    const displayRoles = roles.length > 0
        ? roles.filter((r) => {
            const name = (r.name || "").toLowerCase();
            if (name === "super_admin") {
                // Allow Super Admin selection when current user is Super Admin and either:
                // - there is no existing super admin, or
                // - we're editing the current super admin (maintain role), or
                // - we're editing ourselves
                const isCurrentSuper = (employee?.role || "").toLowerCase().replace(/\s+/g, "_") === "super_admin";
                return (currentUserRole || "").toLowerCase().replace(/\s+/g, "_") === "super_admin" && (!superAdminExists || isCurrentSuper || employee?.id === currentUserId);
            }
            return ["admin", "member", "editor"].includes(name);
        })
        : [
            { id: "admin", name: "admin" },
            { id: "editor", name: "editor" },
            { id: "member", name: "member" }
        ];

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

            // Update employee details (name and employee_code)
            const hasNameChange =
                `${firstName} ${lastName}`.trim() !== employee.name;
            const hasEmployeeCodeChange =
                (employeeCode || null) !== (employee.employeeCode || null);

            if (hasNameChange || hasEmployeeCodeChange) {
                await updateEmployeeDetails(
                    employee.id,
                    {
                        first_name: hasNameChange ? firstName : undefined,
                        last_name: hasNameChange ? lastName : undefined,
                        employee_code: hasEmployeeCodeChange ? (employeeCode || null) : undefined,
                    },
                    token
                );
            }

            // Construct updated employee object
            const updatedEmployee: Employee = {
                ...employee,
                name: `${firstName} ${lastName}`.trim(),
                email,
                role: roleName,
                employeeCode: employeeCode || null,
            };

            onSave(updatedEmployee);
            onOpenChange(false);
        } catch (error: any) {
            console.error("Edit employee error:", error);
            toast.error(error.message || "Failed to update employee");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                data-testid="edit-employee-drawer"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        data-testid="close-edit-drawer-btn"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900">
                        Edit Employee
                    </SheetTitle>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {/* Avatar */}
                    <div>
                        <div className="text-xs text-zinc-500">Employee Avatar</div>
                        <div className="mt-2">
                            <Avatar className="h-24 w-24 rounded-2xl">
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

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* First Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-first-name" className="text-xs font-medium text-zinc-500">
                                    First Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-first-name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                                    placeholder="First Name"
                                    maxLength={50}
                                    className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium"
                                />
                                {touched.firstName && fieldErrors.firstName && (
                                    <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>{fieldErrors.firstName[0]}</span>
                                    </div>
                                )}
                            </div>

                            {/* Last Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-last-name" className="text-xs font-medium text-zinc-500">
                                    Last Name <span className="text-xs text-zinc-450 font-normal">(optional)</span>
                                </Label>
                                <Input
                                    id="edit-last-name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                                    placeholder="Last Name"
                                    maxLength={50}
                                    className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium"
                                />
                                {touched.lastName && fieldErrors.lastName && (
                                    <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>{fieldErrors.lastName[0]}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-email" className="text-xs font-medium text-zinc-500">
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
                                className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                            />
                            {touched.email && fieldErrors.email && (
                                <div className="text-red-500 text-[10px] flex items-center gap-1 mt-0.5">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>{fieldErrors.email[0]}</span>
                                </div>
                            )}
                        </div>

                        {/* Role */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-500">Role</Label>
                            <Select value={roleName} onValueChange={setRoleName}>
                                <SelectTrigger className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {displayRoles.map((r) => {
                                        const displayRole = r.name === "super_admin"
                                            ? "Super Admin"
                                            : r.name.charAt(0).toUpperCase() + r.name.slice(1);
                                        return (
                                            <SelectItem key={r.id} value={displayRole}>
                                                {displayRole}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Employee Code */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-employee-code" className="text-xs font-medium text-zinc-500">
                                Employee Code <span className="text-xs text-zinc-450 font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="edit-employee-code"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                onBlur={() => setTouched(t => ({ ...t, employeeCode: true }))}
                                placeholder="e.g., EMP-001, john-doe"
                                maxLength={50}
                                className="h-10 rounded-lg border-zinc-200 text-base md:text-sm font-medium"
                            />
                            {touched.employeeCode && (
                                <div className="text-zinc-400 text-[10px]">
                                    {EMPLOYEE_CODE_CONSTRAINTS.MIN_LENGTH}-{EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH} characters, alphanumeric, hyphens, underscores, dots
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-white px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="rounded-lg h-10 px-4 text-sm font-medium border-zinc-200 hover:bg-zinc-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="rounded-lg h-10 px-4 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
