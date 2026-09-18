'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailLink } from '@/components/ui/email-link';
import { WhatsAppLink } from '@/components/ui/whatsapp-link';
import { Edit, X } from 'lucide-react';
import { Employee, getEmployeeFullName } from '@/lib/human-resources/employees';
import { EmployeeDocuments } from '@/components/business/human-resources/employees/employee-documents';
import { formatCreatedAt } from '@/utils/format-date';

interface EmployeeDetailsDialogProps {
	employee: Employee | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit: () => void;
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-1">
			<p className="text-xs text-muted-foreground">{label}</p>
			<div className="text-sm text-foreground break-words">{children || '—'}</div>
		</div>
	);
}

export function EmployeeDetailsDialog({
	employee,
	open,
	onOpenChange,
	onEdit,
}: EmployeeDetailsDialogProps) {
	const [activeTab, setActiveTab] = useState('info');

	if (!employee) return null;

	const fullName = getEmployeeFullName(employee);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[60vw] h-[90dvh] sm:h-[85dvh] flex flex-col p-0 sm:p-1"
				showCloseButton={false}
			>
				<DialogHeader>
					<div className="flex m-3 justify-between items-center">
						<DialogTitle>Ficha del empleado</DialogTitle>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onOpenChange(false)}
							className="h-8 w-8"
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
					<DialogDescription className="sr-only">
						Información personal, laboral y documentos del empleado
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto p-2 sm:p-3 pt-0">
					<div className="mb-3 text-center">
						<h3 className="text-lg font-semibold">{fullName}</h3>
						<div className="mt-1 flex flex-wrap items-center justify-center gap-2">
							{employee.position && (
								<span className="text-sm text-muted-foreground">{employee.position}</span>
							)}
							<Badge variant={employee.status === 'Activo' ? 'default' : 'secondary'}>
								{employee.status}
							</Badge>
						</div>
					</div>

					<div className="border-t pt-2">
						<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
							<TabsList className="flex-wrap h-auto justify-start gap-1 w-full">
								<TabsTrigger value="info">Información</TabsTrigger>
								<TabsTrigger value="documents">Documentos</TabsTrigger>
							</TabsList>

							<div className="mt-3">
								<TabsContent value="info" className="space-y-6">
									<section className="space-y-3">
										<h4 className="text-sm font-medium">Datos personales</h4>
										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
											<DetailField label="DNI">{employee.identity_number}</DetailField>
											<DetailField label="Fecha de nacimiento">
												{employee.birth_date ? formatCreatedAt(employee.birth_date) : null}
											</DetailField>
											<DetailField label="Teléfono">
												{employee.phone_number ? (
													<WhatsAppLink
														phone={employee.phone_number}
														className="hover:underline"
														message={`Hola ${employee.name}`}
													>
														{employee.phone_number}
													</WhatsAppLink>
												) : null}
											</DetailField>
											<DetailField label="Email">
												{employee.email ? (
													<EmailLink email={employee.email} className="hover:underline">
														{employee.email}
													</EmailLink>
												) : null}
											</DetailField>
											<DetailField label="Dirección">{employee.address}</DetailField>
											<DetailField label="Localidad">{employee.locality}</DetailField>
										</div>
									</section>

									<section className="space-y-3">
										<h4 className="text-sm font-medium">Datos laborales</h4>
										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
											<DetailField label="Puesto">{employee.position}</DetailField>
											<DetailField label="Fecha de ingreso">
												{employee.hire_date ? formatCreatedAt(employee.hire_date) : null}
											</DetailField>
											<DetailField label="Fecha de egreso">
												{employee.termination_date
													? formatCreatedAt(employee.termination_date)
													: null}
											</DetailField>
											<DetailField label="Usuario del sistema">
												{employee.user_id ? 'Vinculado' : 'Sin usuario asociado'}
											</DetailField>
										</div>
									</section>

									<section className="space-y-3">
										<h4 className="text-sm font-medium">Contacto de emergencia</h4>
										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
											<DetailField label="Nombre">{employee.emergency_contact_name}</DetailField>
											<DetailField label="Teléfono">
												{employee.emergency_contact_phone ? (
													<WhatsAppLink
														phone={employee.emergency_contact_phone}
														className="hover:underline"
													>
														{employee.emergency_contact_phone}
													</WhatsAppLink>
												) : null}
											</DetailField>
										</div>
									</section>

									{employee.notes && (
										<section className="space-y-3">
											<h4 className="text-sm font-medium">Observaciones</h4>
											<p className="text-sm text-muted-foreground whitespace-pre-wrap">
												{employee.notes}
											</p>
										</section>
									)}

									<div className="flex justify-end">
										<Button variant="outline" onClick={onEdit} className="gap-2">
											<Edit className="h-4 w-4" />
											Editar
										</Button>
									</div>
								</TabsContent>

								<TabsContent value="documents">
									<EmployeeDocuments employeeId={employee.id} enabled={activeTab === 'documents'} />
								</TabsContent>
							</div>
						</Tabs>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
