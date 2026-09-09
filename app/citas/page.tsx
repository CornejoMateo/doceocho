import { PublicBooking } from '@/components/business/appointments/public/public-booking';
import { PublicAppointmentsLayout } from '@/components/business/appointments/public/public-layout';

export const metadata = {
	title: 'Pedir una cita | Doce Ocho',
	description: 'Elegí un día y un horario para tu cita.',
};

export default function PublicAppointmentsPage() {
	return (
		<PublicAppointmentsLayout
			title="Pedir una cita"
			subtitle="Elegí el día y el horario que te queden cómodos."
		>
			<PublicBooking />
		</PublicAppointmentsLayout>
	);
}
