'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { HumanResourcesManagement } from '@/components/business/human-resources/human-resources-management';

export default function HumanResourcesPage() {
	return (
		<DashboardLayout>
			<HumanResourcesManagement />
		</DashboardLayout>
	);
}
