import { PublicBooking } from '@/components/business/appointments/public/public-booking';
import { PublicPageLayout } from '@/components/ui/public-page-layout';

export const metadata = {
	title: 'Pedir una cita | Doce Ocho',
	description: 'Elegí un día y un horario para tu cita.',
};

export default function PublicAppointmentsPage() {
	return (
		<PublicPageLayout
			title="Pedir una cita"
			subtitle="Elegí el día y el horario que te queden cómodos."
		>
			<PublicBooking />
		</PublicPageLayout>
	);
}
