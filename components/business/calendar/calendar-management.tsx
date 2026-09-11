'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/provider/auth-provider';
import { CalendarView } from '@/components/business/calendar/calendar-view';
import { AppointmentsTab } from '@/components/business/calendar/appointments/appointments-tab';

export function CalendarManagement() {
	const { user } = useAuth();

	// Only admins review appointments and configure availability.
	const isAuthorized = user?.role === 'Admin';

	if (!isAuthorized) {
		return <CalendarView />;
	}

	return (
		<Tabs defaultValue="calendar" className="space-y-6">
			<TabsList className="flex-wrap h-auto justify-start gap-1">
				<TabsTrigger value="calendar">Calendario</TabsTrigger>
				<TabsTrigger value="appointments">Citas</TabsTrigger>
			</TabsList>

			<TabsContent value="calendar">
				<CalendarView />
			</TabsContent>

			<TabsContent value="appointments">
				<AppointmentsTab />
			</TabsContent>
		</Tabs>
	);
}
