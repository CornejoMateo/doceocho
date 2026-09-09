'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/provider/auth-provider';
import { EmployeesTab } from '@/components/business/human-resources/employees/employees-tab';
import { EvaluationsTab } from '@/components/business/human-resources/evaluations/evaluations-tab';

// Placeholder for the tabs that are not implemented yet.
function ComingSoonTab({ title, description }: { title: string; description: string }) {
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">Por ahora no hay nada para mostrar.</p>
			</CardContent>
		</Card>
	);
}

export function HumanResourcesManagement() {
	const { user } = useAuth();

	const isAuthorized = user?.role === 'Admin';

	if (!isAuthorized) {
		return (
			<Card className="w-full max-w-md mx-auto">
				<CardHeader>
					<CardTitle>Acceso restringido</CardTitle>
					<CardDescription>
						Esta sección solo está disponible para usuarios administradores.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground text-balance">Recursos Humanos</h2>
				<p className="text-muted-foreground mt-1">Gestión del personal de la empresa</p>
			</div>

			<Tabs defaultValue="employees" className="space-y-6">
				<TabsList className="flex-wrap h-auto justify-start gap-1">
					<TabsTrigger value="employees">Empleados</TabsTrigger>
					<TabsTrigger value="evaluations">Evaluación de empleados</TabsTrigger>
					<TabsTrigger value="vacations">Vacaciones</TabsTrigger>
				</TabsList>

				<TabsContent value="employees">
					<EmployeesTab />
				</TabsContent>

				<TabsContent value="evaluations">
					<EvaluationsTab />
				</TabsContent>

				<TabsContent value="vacations">
					<ComingSoonTab
						title="Vacaciones"
						description="Sección en construcción. Acá vamos a gestionar los períodos de vacaciones."
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
