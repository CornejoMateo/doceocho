import { PublicPageLayout } from '@/components/ui/public-page-layout';
import { ClientBudgetView } from '@/components/business/budget-builder/public/client-budget-view';

export const metadata = {
	title: 'Presupuesto | Doce Ocho',
	description: 'Tu presupuesto, con cada mueble en 3D.',
};

export default async function ClientBudgetTokenPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	return (
		<PublicPageLayout
			title="Tu presupuesto"
			subtitle="Girá cada mueble para verlo desde todos los ángulos."
		>
			<ClientBudgetView token={token} />
		</PublicPageLayout>
	);
}
