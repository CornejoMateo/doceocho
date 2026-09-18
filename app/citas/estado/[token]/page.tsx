import { AppointmentStatus } from '@/components/business/appointments/public/appointment-status';
import { PublicPageLayout } from '@/components/ui/public-page-layout';

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
		<PublicPageLayout title="Estado de tu cita">
			<AppointmentStatus token={token} />
		</PublicPageLayout>
	);
}
