import { useEffect, useState, type JSX } from "react";
import { X, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { createInvite, listRoles } from "@/lib/api";
import { toast } from "sonner";

type EmployeeForm = {
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
};

interface AddEmployeeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any, invite: boolean) => void;
    nextEmployeeId: string;
}

const initialForm: EmployeeForm = {
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
};

export default function AddEmployeeDrawer({
    open,
    onOpenChange,
    onSubmit,
    nextEmployeeId,
}: AddEmployeeDrawerProps): JSX.Element {
    const { getToken } = useKindeAuth();
    const [form, setForm] = useState<EmployeeForm>(initialForm);
    const [touched, setTouched] = useState<{ [K in keyof EmployeeForm]?: boolean }>({});
    const [roles, setRoles] = useState<{ id: string; name: string; description?: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setForm(initialForm);
            setTouched({});
        } else {
            const fetchRoles = async () => {
                try {
                    const token = await getToken();
                    if (token) {
                        const data = await listRoles(token);
                        setRoles(Array.isArray(data) ? data : []);
                    }
                } catch (err) {
                    console.error("Failed to load roles:", err);
                }
            };
            fetchRoles();
        }
    }, [open]);

    const updateField = <K extends keyof EmployeeForm>(
        key: K,
        value: EmployeeForm[K]
    ): void => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
        setTouched((prev) => ({
            ...prev,
            [key]: true,
        }));
    };

    const handleBlur = (key: keyof EmployeeForm) => {
        setTouched((prev) => ({ ...prev, [key]: true }));
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isFirstNameValid = form.firstName.trim() !== "";
    const isLastNameValid = form.lastName.trim() !== "";
    const isEmailValid = emailRegex.test(form.email.trim());
    const isRoleValid = form.roleId !== "";

    const canSave = isFirstNameValid && isLastNameValid && isEmailValid && isRoleValid;

    const submit = async (): Promise<void> => {
        if (!canSave || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const token = await getToken();
            if (!token) {
                toast.error("You must be logged in to invite employees");
                return;
            }

            // Call invite API
            await createInvite({
                email: form.email,
                first_name: form.firstName,
                last_name: form.lastName || null,
                role_name: roles.find(r => r.id === form.roleId)?.name || "member",
            }, token);

            toast.success(`Invite sent to ${form.email}`);
            
            // Notify parent
            onSubmit(
                {
                    id: nextEmployeeId,
                    name: `${form.firstName} ${form.lastName}`.trim(),
                    email: form.email,
                    role: roles.find(r => r.id === form.roleId)?.name || "Member",
                },
                true
            );
            onOpenChange(false);
        } catch (error: any) {
            console.error("Invite error:", error);
            toast.error(error.message || "Failed to send invite");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                data-testid="add-employee-drawer"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        data-testid="close-drawer-btn"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <SheetTitle className="text-lg font-semibold text-zinc-900">
                        Add Employee
                    </SheetTitle>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* First Name */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="emp-first-name"
                            className="text-sm font-medium text-zinc-700"
                        >
                            First Name <span className="text-red-500 ml-0.5">*</span>
                        </Label>

                        <Input
                            id="emp-first-name"
                            value={form.firstName}
                            onChange={(e) => updateField("firstName", e.target.value)}
                            onBlur={() => handleBlur("firstName")}
                            placeholder="Enter first name"
                            data-testid="emp-first-name-input"
                            className="h-11 rounded-lg border-zinc-200"
                        />
                        {touched.firstName && !isFirstNameValid && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>First name is required.</span>
                            </div>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="emp-last-name"
                            className="text-sm font-medium text-zinc-700"
                        >
                            Last Name <span className="text-red-500 ml-0.5">*</span>
                        </Label>

                        <Input
                            id="emp-last-name"
                            value={form.lastName}
                            onChange={(e) => updateField("lastName", e.target.value)}
                            onBlur={() => handleBlur("lastName")}
                            placeholder="Enter last name"
                            data-testid="emp-last-name-input"
                            className="h-11 rounded-lg border-zinc-200"
                        />
                        {touched.lastName && !isLastNameValid && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Last name is required.</span>
                            </div>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="emp-email"
                            className="text-sm font-medium text-zinc-700"
                        >
                            Email <span className="text-red-500 ml-0.5">*</span>
                        </Label>

                        <Input
                            id="emp-email"
                            type="email"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            onBlur={() => handleBlur("email")}
                            placeholder="Enter email address"
                            data-testid="emp-email-input"
                            className="h-11 rounded-lg border-zinc-200"
                        />
                        {touched.email && form.email.trim() === "" && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Email address is required.</span>
                            </div>
                        )}
                        {touched.email && form.email.trim() !== "" && !isEmailValid && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Please enter a valid email address.</span>
                            </div>
                        )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">
                            Role <span className="text-red-500 ml-0.5">*</span>
                        </Label>

                        <Select
                            value={form.roleId}
                            onValueChange={(v) => updateField("roleId", v)}
                        >
                            <SelectTrigger
                                className="h-11 rounded-lg border-zinc-200"
                                data-testid="emp-role-select"
                            >
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>

                            <SelectContent>
                                {roles.map((r) => {
                                    const displayRole = r.name === "super_admin" 
                                        ? "Super Admin" 
                                        : r.name.charAt(0).toUpperCase() + r.name.slice(1);
                                    return (
                                        <SelectItem key={r.id} value={r.id}>
                                            {displayRole}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        {touched.roleId && !isRoleValid && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Please select a role.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-white px-6 py-4">
                    <Button
                        onClick={submit}
                        disabled={!canSave || isSubmitting}
                        data-testid="save-invite-employee-btn"
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {isSubmitting ? "Sending..." : "Send Invite"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}