import { PublicPageLayout } from '@/components/ui/public-page-layout';
import { ClientBudgetView } from '@/components/business/budget-builder/public/client-budget-view';

export const metadata = {
	title: 'Presupuesto | Doce Ocho',
	description: 'Tu presupuesto, con cada mueble en 3D.',
};

export default function ClientBudgetPage() {
	return (
		<PublicPageLayout
			title="Tu presupuesto"
			subtitle="Girá cada mueble para verlo desde todos los ángulos."
		>
			<ClientBudgetView />
		</PublicPageLayout>
	);
}
