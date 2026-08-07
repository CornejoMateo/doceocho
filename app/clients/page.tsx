import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ClientManagement } from '@/components/business/clients/client-management';
import { Suspense } from 'react';

export default function ClientsPage() {
	return (
		<DashboardLayout>
			<Suspense fallback={<div>Cargando...</div>}>
				<ClientManagement />
			</Suspense>
		</DashboardLayout>
	);
}
