import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { BudgetBuilderManagement } from '@/components/business/budget-builder/budget-builder-management';

export default function BudgetBuilderPage() {
	return (
		<DashboardLayout>
			<Suspense fallback={null}>
				<BudgetBuilderManagement />
			</Suspense>
		</DashboardLayout>
	);
}
