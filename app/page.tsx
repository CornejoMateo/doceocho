'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DashboardHome } from '@/components/layout/dashboard-home';
import { useAuth } from '@/components/provider/auth-provider';
import { useCanView } from '@/hooks/permissions/use-can-view';

export default function HomePage() {
	const { user, loading } = useAuth();
	const canView = useCanView();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-900">
				<div className="text-white text-lg">Cargando...</div>
			</div>
		);
	}

	// The layout decides where users without the panel land, from their views.
	// Redirecting here too (by role) fought with it and bounced between '/' and the home route.
	return <DashboardLayout>{user && canView('panel') && <DashboardHome />}</DashboardLayout>;
}
