import { X, FileText, MessageSquare, MessagesSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type FieldProps = {
    label: string;
    value?: string | number | null;
    testId?: string;
};

function Field({ label, value, testId }: FieldProps) {
    return (
        <div>
            <div className="text-xs text-zinc-500">{label}</div>
            <div
                className="mt-1 text-sm font-medium text-zinc-900"
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
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <Icon className="h-5 w-5 text-zinc-700" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-sm font-semibold text-zinc-900">{value}</div>
            </div>
        </div>
    );
}

import type { Employee } from "@/types/employee";

type EmployeeDetailsDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
};

export default function EmployeeDetailsDrawer({
    open,
    onOpenChange,
    employee,
}: EmployeeDetailsDrawerProps) {
    if (!employee) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                hideClose
                className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
                data-testid="employee-details-drawer"
            >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        data-testid="close-details-drawer-btn"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <SheetTitle className="text-lg font-semibold text-zinc-900">
                        Employee Details
                    </SheetTitle>
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
                                    {employee.name
                                        ? employee.name
                                            .split(" ")
                                            .filter(Boolean)
                                            .map((n) => n[0])
                                            .join("")
                                            .slice(0, 2)
                                        : "EMP"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Two-column field grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <Field
                            label="Employee Name"
                            value={employee.name}
                            testId="details-name"
                        />
                        <Field
                            label="Email"
                            value={employee.email}
                            testId="details-email"
                        />
                        <Field
                            label="Mobile Number"
                            value={
                                employee.mobile
                                    ? `${employee.countryCode || "+1"} ${employee.mobile}`
                                    : "-"
                            }
                            testId="details-mobile"
                        />
                        <Field
                            label="Gender"
                            value={employee.gender || "-"}
                            testId="details-gender"
                        />
                        <Field
                            label="Date Of Birth"
                            value={
                                employee.dob
                                    ? new Date(employee.dob).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })
                                    : "-"
                            }
                            testId="details-dob"
                        />
                        <Field label="Role" value={employee.role} testId="details-role" />
                        <Field
                            label="Teams"
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

                    <div className="border-t border-zinc-100" />

                    {/* Usage */}
                    <div>
                        <div className="text-sm font-semibold text-zinc-900">Usage</div>
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
                </div>
            </SheetContent>
        </Sheet>
    );
}