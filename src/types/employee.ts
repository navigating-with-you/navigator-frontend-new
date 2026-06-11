export type EmployeeStatus = "online" | "away" | "offline" | "pending" | "Accepted";
export type EmployeeRole = "Super Admin" | "Admin" | "Editor" | "Member";

export interface EmployeeGroup {
    id: string;
    name: string;
    manager: string | null;
}

export interface Employee {
    id: string;
    name: string;
    email: string;
    avatar: string;
    status: EmployeeStatus;
    role: string;
    category: string;
    groups: EmployeeGroup[];
    createdBy: string;
    createdDate: string;
    kbFiles: number | null;
    simpleInteraction: string | null;
    complexInteraction: string | null;
    inviteId?: string;
    isActive?: boolean;
    employeeCode?: string | null;
}
