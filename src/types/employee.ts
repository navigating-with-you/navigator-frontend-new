export type EmployeeStatus = "online" | "away" | "offline";
export type EmployeeRole = "Super Admin" | "Admin" | "Editor" | "Member";

export interface Employee {
    id: string;
    name: string;
    email: string;
    avatar: string;
    status: EmployeeStatus;
    mobile?: string;
    countryCode?: string;
    gender?: string;
    dob?: string | Date;
    role: string;
    category: string;
    createdBy: string;
    createdDate: string;
    kbFiles: number | null;
    simpleInteraction: string | null;
    complexInteraction: string | null;
    inviteId?: string;
    isActive?: boolean;
}
