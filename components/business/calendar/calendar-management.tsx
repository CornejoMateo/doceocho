'use client';

import { EditScope } from '@/components/permissions/edit-scope';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCanView } from '@/hooks/permissions/use-can-view';
import { CalendarView } from '@/components/business/calendar/calendar-view';
import { AppointmentsTab } from '@/components/business/calendar/appointments/appointments-tab';

export function CalendarManagement() {
	const canView = useCanView();

	// Whoever can see the Citas tab reviews appointments and configures availability.
	if (!canView('calendar.appointments')) {
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
				<EditScope edit="calendar.appointments">
					<AppointmentsTab />
				</EditScope>
			</TabsContent>
		</Tabs>
	);
}
