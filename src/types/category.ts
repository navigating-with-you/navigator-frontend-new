export interface CategoryFile {
  id: string;
  name: string;
  size: string;
  mimeType: string;
}

export interface CategoryEmployee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  managerId: string;
  managerName: string;
  kbCount: number;
  employeeCount: number;
  employees: CategoryEmployee[];
  files: CategoryFile[];
  type: "Department" | "Project" | "Operational" | "General";
  createdBy: string;
  createdDate: string;
  isArchived?: boolean;
}
