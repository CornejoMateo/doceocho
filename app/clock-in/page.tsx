'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ClockIn } from '@/components/business/clock-in/clock-in';

export default function ClockInPage() {
	return (
		<DashboardLayout>
			<ClockIn />
		</DashboardLayout>
	);
}
