import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CalendarManagement } from '@/components/business/calendar/calendar-management';

export default function CalendarPage() {
	return (
		<DashboardLayout>
			<CalendarManagement />
		</DashboardLayout>
	);
}
