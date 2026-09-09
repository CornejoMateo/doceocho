import { AppointmentStatus } from '@/components/business/appointments/public/appointment-status';
import { PublicAppointmentsLayout } from '@/components/business/appointments/public/public-layout';

export const metadata = {
	title: 'Estado de tu cita | Doce Ocho',
};

export default async function AppointmentStatusPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	return (
		<PublicAppointmentsLayout title="Estado de tu cita">
			<AppointmentStatus token={token} />
		</PublicAppointmentsLayout>
	);
}
