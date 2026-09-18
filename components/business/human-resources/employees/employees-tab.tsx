'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
	Briefcase,
	Edit,
	Eye,
	IdCard,
	Mail,
	Phone,
	Plus,
	Search,
	Trash2,
	Users,
} from 'lucide-react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { paginateAndFilter } from '@/utils/pagination';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import {
	Employee,
	deleteEmployee,
	getEmployeeFullName,
	listEmployees,
} from '@/lib/human-resources/employees';
import { listUsers, User } from '@/lib/users/users';
import { EMPLOYEES_PER_PAGE } from '@/constants/human-resources/employees';
import { EmployeeFormDialog } from '@/components/business/human-resources/employees/employee-form-dialog';
import { EmployeeDetailsDialog } from '@/components/business/human-resources/employees/employee-details-dialog';

function getInitials(employee: Employee): string {
	const lastNameInitial = employee.last_name?.trim()[0] ?? '';
	const nameInitial = employee.name?.trim()[0] ?? '';

	return `${lastNameInitial}${nameInitial}`.toUpperCase();
}

export function EmployeesTab() {
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
	const [employeeToView, setEmployeeToView] = useState<Employee | null>(null);
	const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const {
		data: employees,
		loading,
		error,
		refresh,
	} = useOptimizedRealtime<Employee>(
		'employees',
		async () => {
			const { data, error: listError } = await listEmployees();
			if (listError) throw listError;
			return data ?? [];
		},
		'employees_cache'
	);

	// Users are only needed to link an employee with its system account.
	const { data: users } = useOptimizedRealtime<User>(
		'users',
		async () => {
			const { data, error: listError } = await listUsers();
			if (listError) throw listError;
			return data ?? [];
		},
		'users_cache',
		true
	);

	const linkedUserIds = useMemo(
		() => employees.map((employee) => employee.user_id).filter((id): id is string => Boolean(id)),
		[employees]
	);

	const {
		paginatedData: currentEmployees,
		totalPages,
		totalItems,
	} = useMemo(
		() =>
			paginateAndFilter(
				employees,
				searchTerm,
				currentPage,
				EMPLOYEES_PER_PAGE,
				(employee, search) =>
					employee.name?.toLowerCase().includes(search) ||
					employee.last_name?.toLowerCase().includes(search) ||
					employee.position?.toLowerCase().includes(search) ||
					employee.identity_number?.toLowerCase().includes(search) ||
					false
			),
		[employees, searchTerm, currentPage]
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	const handleCreate = () => {
		setEmployeeToEdit(null);
		setIsFormOpen(true);
	};

	const handleEdit = (employee: Employee) => {
		setEmployeeToEdit(employee);
		setIsFormOpen(true);
	};

	const handleEditFromDetails = () => {
		if (!employeeToView) return;

		setEmployeeToEdit(employeeToView);
		setEmployeeToView(null);
		setIsFormOpen(true);
	};

	const handleDelete = async () => {
		if (!employeeToDelete) return;

		setIsDeleting(true);

		try {
			const { error: deleteError } = await deleteEmployee(employeeToDelete.id);

			if (deleteError) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar empleado',
					description: translateError(deleteError),
				});
				return;
			}

			toast({
				title: 'Empleado eliminado',
				description: `${getEmployeeFullName(employeeToDelete)} fue eliminado correctamente.`,
			});

			setEmployeeToDelete(null);
			await refresh();
		} finally {
			setIsDeleting(false);
		}
	};

	const activeEmployees = employees.filter((employee) => employee.status === 'Activo').length;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h3 className="text-xl font-bold text-foreground">Empleados</h3>
					<p className="text-muted-foreground mt-1">
						Ficha con la información y documentación de cada empleado
					</p>
				</div>
				<Button onClick={handleCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Nuevo empleado
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Total empleados</p>
							<p className="text-2xl font-bold text-foreground mt-2">{employees.length}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Users className="h-6 w-6" />
						</div>
					</div>
				</Card>
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Activos</p>
							<p className="text-2xl font-bold text-foreground mt-2">{activeEmployees}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-2">
							<Briefcase className="h-6 w-6" />
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-4 bg-card border-border">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Buscar por nombre, puesto o DNI..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="pl-9 bg-background"
					/>
				</div>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{loading && (
					<p className="text-center text-muted-foreground py-8 col-span-full">
						Cargando empleados...
					</p>
				)}
				{error && !loading && (
					<p className="text-center text-destructive py-8 col-span-full">
						Error al cargar empleados: {translateError(error)}
					</p>
				)}
				{!loading && !error && currentEmployees.length === 0 && (
					<p className="text-center text-muted-foreground py-8 col-span-full">
						{searchTerm
							? `No se encontraron empleados con el término de búsqueda "${searchTerm}"`
							: 'No hay empleados registrados.'}
					</p>
				)}
				{!loading &&
					!error &&
					currentEmployees.map((employee) => (
						<Card
							key={employee.id}
							className="p-6 bg-card border-border hover:border-primary/50 transition-colors"
						>
							<div className="space-y-4">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-3 min-w-0">
										<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
											<span className="font-semibold text-primary text-lg">
												{getInitials(employee)}
											</span>
										</div>
										<div className="min-w-0">
											<h4 className="font-semibold text-foreground truncate">
												{getEmployeeFullName(employee)}
											</h4>
											{employee.position && (
												<p className="text-xs text-muted-foreground truncate">
													{employee.position}
												</p>
											)}
										</div>
									</div>
									<button
										onClick={() => setEmployeeToDelete(employee)}
										className="text-muted-foreground hover:text-destructive transition-colors"
										title="Eliminar empleado"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>

								<div className="space-y-2 text-sm">
									{employee.identity_number && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<IdCard className="h-4 w-4 flex-shrink-0" />
											<span className="truncate">{employee.identity_number}</span>
										</div>
									)}
									{employee.phone_number && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Phone className="h-4 w-4 flex-shrink-0" />
											<span className="truncate">{employee.phone_number}</span>
										</div>
									)}
									{employee.email && (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Mail className="h-4 w-4 flex-shrink-0" />
											<span className="truncate">{employee.email}</span>
										</div>
									)}
								</div>

								<div className="flex items-center justify-between border-t pt-3">
									<Badge variant={employee.status === 'Activo' ? 'default' : 'secondary'}>
										{employee.status}
									</Badge>
									{!employee.user_id && (
										<span className="text-xs text-muted-foreground">Sin usuario</span>
									)}
								</div>

								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1 gap-2 bg-transparent"
										onClick={() => setEmployeeToView(employee)}
									>
										<Eye className="h-4 w-4" />
										Ver ficha
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="flex-1 gap-2 bg-transparent"
										onClick={() => handleEdit(employee)}
									>
										<Edit className="h-4 w-4" />
										Editar
									</Button>
								</div>
							</div>
						</Card>
					))}
			</div>

			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={totalItems}
				itemsPerPage={EMPLOYEES_PER_PAGE}
				onPageChange={setCurrentPage}
				itemLabel="empleados"
			/>

			<EmployeeFormDialog
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				employeeToEdit={employeeToEdit}
				users={users}
				linkedUserIds={linkedUserIds}
				onSaved={refresh}
			/>

			<EmployeeDetailsDialog
				employee={employeeToView}
				open={!!employeeToView}
				onOpenChange={(open) => !open && setEmployeeToView(null)}
				onEdit={handleEditFromDetails}
			/>

			<ConfirmDialog
				open={!!employeeToDelete}
				onOpenChange={(open) => !open && setEmployeeToDelete(null)}
				title="Eliminar empleado"
				description={`Se eliminarán la ficha y todos los documentos de ${
					employeeToDelete ? getEmployeeFullName(employeeToDelete) : ''
				}. Esta acción no se puede deshacer.`}
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
