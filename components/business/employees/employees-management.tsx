'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/provider/auth-provider';
import { useUsers } from '@/components/provider/users-provider';
import type { UserRole } from '@/constants/users/user-role';
import { ClockIn } from '@/components/business/clock-in/clock-in';
import { ModuleManagement } from '@/components/business/modules/module-management';
import { EmployeesTab } from '@/components/business/human-resources/employees/employees-tab';
import { EvaluationsTab } from '@/components/business/human-resources/evaluations/evaluations-tab';
import { VacationsTab } from '@/components/business/human-resources/vacations/vacations-tab';
import { EmployeesTabValue, TABS } from '@/constants/employees/employees';

export function EmployeesManagement() {
	const { user } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();

	const isAdmin = user?.role === 'Admin';
	const { users } = useUsers();

	if (!user?.role) return null;

	const visibleTabs = TABS.filter((tab) => tab.roles.includes(user.role as UserRole));
	const requestedTab = searchParams.get('tab') ?? '';
	const activeTab = visibleTabs.some((tab) => tab.value === requestedTab)
		? requestedTab
		: 'fichajes';

	const isVisible = (value: EmployeesTabValue) => visibleTabs.some((tab) => tab.value === value);

	const setTab = (tab: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('tab', tab);
		router.replace(`?${params.toString()}`, { scroll: false });
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-foreground text-balance">Empleados</h2>
				<p className="text-muted-foreground mt-1">
					{isAdmin
						? 'Fichajes, módulos, fichas, evaluaciones y vacaciones del personal'
						: 'Tus fichajes, módulos y vacaciones'}
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setTab} className="min-w-0 space-y-6">
				{visibleTabs.length > 1 && (
					<TabsList className="flex-wrap h-auto justify-start gap-1">
						{visibleTabs.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				)}

				{isVisible('fichajes') && (
					<TabsContent value="fichajes" className="min-w-0">
						<ClockIn users={users} />
					</TabsContent>
				)}

				{isVisible('modulos') && (
					<TabsContent value="modulos" className="min-w-0">
						<ModuleManagement users={users} />
					</TabsContent>
				)}

				{isVisible('fichas') && (
					<TabsContent value="fichas">
						<EmployeesTab />
					</TabsContent>
				)}

				{isVisible('evaluaciones') && (
					<TabsContent value="evaluaciones">
						<EvaluationsTab />
					</TabsContent>
				)}

				{isVisible('vacaciones') && (
					<TabsContent value="vacaciones">
						<VacationsTab />
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}
