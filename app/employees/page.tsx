'use client';

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EmployeesManagement } from '@/components/business/employees/employees-management';

export default function EmployeesPage() {
	return (
		<DashboardLayout>
			<Suspense fallback={<div>Cargando...</div>}>
				<EmployeesManagement />
			</Suspense>
		</DashboardLayout>
	);
}
