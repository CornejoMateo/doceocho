export type EmployeeStatus = 'Activo' | 'Inactivo';

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Activo', 'Inactivo']; // Used for selects

export const EMPLOYEES_PER_PAGE = 6;

// Documents kept in an employee file: contracts, ID scans, certificates, etc.
export const EMPLOYEE_DOCUMENTS_BUCKET = 'employees';

export const MAX_EMPLOYEE_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB
