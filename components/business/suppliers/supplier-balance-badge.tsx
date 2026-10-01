import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, normalizeMoney } from '@/utils/formats-money';
import type { SupplierAccountSummary } from '@/lib/suppliers/account-summary';

const balanceBadgeClassName = {
	debemos: 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
	'al-dia': 'border-transparent bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
	'a-favor': 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

interface SupplierBalanceBadgeProps {
	summary: SupplierAccountSummary | undefined;
	loading: boolean;
	error: boolean;
}

export function SupplierBalanceBadge({ summary, loading, error }: SupplierBalanceBadgeProps) {
	if (loading) return <Skeleton className="h-5 w-24" />;
	if (error || !summary) return <span className="text-muted-foreground">—</span>;

	const balance = normalizeMoney(summary.balanceArs);
	if (balance > 0) {
		// Single string child (not "Debemos {x}") so tests can match the full text as one node.
		return (
			<Badge
				className={balanceBadgeClassName.debemos}
			>{`Debemos ${formatCurrency(balance)}`}</Badge>
		);
	}
	if (balance < 0) {
		return (
			<Badge
				className={balanceBadgeClassName['a-favor']}
			>{`A favor ${formatCurrency(Math.abs(balance))}`}</Badge>
		);
	}
	return <Badge className={balanceBadgeClassName['al-dia']}>Al día</Badge>;
}
