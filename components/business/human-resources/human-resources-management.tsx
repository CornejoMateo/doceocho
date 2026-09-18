'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/provider/auth-provider';
import { EmployeesTab } from '@/components/business/human-resources/employees/employees-tab';
import { EvaluationsTab } from '@/components/business/human-resources/evaluations/evaluations-tab';
import { VacationsTab } from '@/components/business/human-resources/vacations/vacations-tab';

export function HumanResourcesManagement() {
	const { user } = useAuth();

	// Employees and evaluations are admin only; vacations are for everyone.
	const isAuthorized = user?.role === 'Admin';

	if (!user) return null;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground text-balance">Recursos Humanos</h2>
				<p className="text-muted-foreground mt-1">
					{isAuthorized ? 'Gestión del personal de la empresa' : 'Tus vacaciones y solicitudes'}
				</p>
			</div>

			<Tabs defaultValue={isAuthorized ? 'employees' : 'vacations'} className="space-y-6">
				<TabsList className="flex-wrap h-auto justify-start gap-1">
					{isAuthorized && (
						<>
							<TabsTrigger value="employees">Empleados</TabsTrigger>
							<TabsTrigger value="evaluations">Evaluación de empleados</TabsTrigger>
						</>
					)}
					<TabsTrigger value="vacations">Vacaciones</TabsTrigger>
				</TabsList>

				{isAuthorized && (
					<>
						<TabsContent value="employees">
							<EmployeesTab />
						</TabsContent>

						<TabsContent value="evaluations">
							<EvaluationsTab />
						</TabsContent>
					</>
				)}

				<TabsContent value="vacations">
					<VacationsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
