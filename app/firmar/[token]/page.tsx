import { SignBudget } from '@/components/business/budgets/public/sign-budget';
import { PublicPageLayout } from '@/components/ui/public-page-layout';

export const metadata = {
	title: 'Firmar presupuesto | Doce Ocho',
	description: 'Revisá el presupuesto y firmalo online.',
};

export default async function SignBudgetPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;

	return (
		<PublicPageLayout
			title="Firmar presupuesto"
			subtitle="Revisá el documento y firmá donde está marcado."
		>
			<SignBudget token={token} />
		</PublicPageLayout>
	);
}
