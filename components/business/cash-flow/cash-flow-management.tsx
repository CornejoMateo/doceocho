'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { BankAccount, listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { BankAccountsTab } from '@/components/business/cash-flow/bank-accounts/bank-accounts-tab';
import { SuppliersManagement } from '@/components/business/suppliers/suppliers-management';
import { CheckingAccountsTab } from '@/components/business/cash-flow/balances-tab/checking-accounts-tab';
import { SummaryTab } from '@/components/business/cash-flow/summary/summary-tab';
import { CategoriesConfig } from '@/components/business/cash-flow/shared/categories-config';
import { FixedExpensesTab } from '@/components/business/cash-flow/fixed-expenses/fixed-expenses-tab';
import { IncomesTab } from '@/components/business/cash-flow/incomes-expenses/incomes-tab';
import { ExpensesTab } from '@/components/business/cash-flow/incomes-expenses/expenses-tab';
import { CollectionsTab } from '@/components/business/cash-flow/collections-payments/collections-tab';
import { PaymentsTab } from '@/components/business/cash-flow/collections-payments/payments-tab';
import { CASH_FLOW_TABS, CashFlowTabValue } from '@/constants/cashflow/tabs';
import { useCanView } from '@/hooks/permissions/use-can-view';
import { EditScope } from '@/components/permissions/edit-scope';
import { CATEGORY_TABS } from '@/constants/cashflow/category-tabs';

function CashFlowTabHeader({ value }: { value: CashFlowTabValue }) {
	const tab = CASH_FLOW_TABS.find((t) => t.value === value);
	if (!tab) return null;
	return (
		<div>
			<h3 className="text-xl font-semibold text-foreground">{tab.title}</h3>
			<p className="text-muted-foreground mt-1">{tab.description}</p>
		</div>
	);
}

export function CashFlowManagement() {
	const [activeTab, setActiveTab] = useState<CashFlowTabValue>('summary');
	const canView = useCanView();
	const visibleTabs = CASH_FLOW_TABS.filter((tab) => canView(`cash-flow.${tab.value}`));
	// A hidden tab can never be the open one; fall back to the first the user can see.
	const currentTab = visibleTabs.some((tab) => tab.value === activeTab)
		? activeTab
		: visibleTabs[0]?.value;

	const { data: bankAccounts, refresh: refreshBankAccounts } = useOptimizedRealtime<BankAccount>(
		'bank_accounts',
		async () => {
			const { data } = await listBankAccounts();
			return data ?? [];
		},
		'all_bank_accounts_cache'
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Flujo de Fondos</h2>
					<p className="text-muted-foreground mt-1">Gestión de ingresos, egresos y cajas</p>
				</div>
			</div>

			<Tabs
				value={currentTab}
				onValueChange={(value) => setActiveTab(value as CashFlowTabValue)}
				className="space-y-6"
			>
				<div className="overflow-x-auto">
					<TabsList className="w-max flex-nowrap">
						{visibleTabs.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<TabsContent value="summary" className="space-y-6 min-w-0">
					<CashFlowTabHeader value="summary" />
					<SummaryTab />
				</TabsContent>

				<TabsContent value="bank-accounts" className="space-y-6">
					<EditScope edit="cash-flow.bank-accounts">
						<CashFlowTabHeader value="bank-accounts" />
						<BankAccountsTab
							bankAccounts={bankAccounts}
							onBankAccountsUpdated={refreshBankAccounts}
						/>
					</EditScope>
				</TabsContent>

				<TabsContent value="suppliers" className="space-y-6">
					<EditScope edit="cash-flow.suppliers">
						<CashFlowTabHeader value="suppliers" />
						<SuppliersManagement />
					</EditScope>
				</TabsContent>

				<TabsContent value="checking-accounts" className="space-y-6">
					<EditScope edit="cash-flow.checking-accounts">
						<CashFlowTabHeader value="checking-accounts" />
						<CheckingAccountsTab />
					</EditScope>
				</TabsContent>

				{Object.entries(CATEGORY_TABS).map(([tabValue, config]) => {
					const categoriesConfig = (
						<CategoriesConfig
							kind={config.kind}
							title={config.title}
							triggerLabel={config.triggerLabel}
							newLabel={config.newLabel}
							emptyLabel={config.emptyLabel}
						/>
					);
					return (
						<TabsContent key={tabValue} value={tabValue} className="space-y-6 min-w-0">
							<EditScope edit={`cash-flow.${tabValue}`}>
								<CashFlowTabHeader value={tabValue as CashFlowTabValue} />
								{tabValue === 'fixed-expenses' ? (
									<>
										<div className="flex items-center justify-end">{categoriesConfig}</div>
										<FixedExpensesTab />
									</>
								) : tabValue === 'incomes' ? (
									<IncomesTab categoriesConfig={categoriesConfig} />
								) : tabValue === 'expenses' ? (
									<ExpensesTab categoriesConfig={categoriesConfig} />
								) : tabValue === 'collections' ? (
									<CollectionsTab categoriesConfig={categoriesConfig} />
								) : tabValue === 'payments' ? (
									<PaymentsTab categoriesConfig={categoriesConfig} />
								) : (
									<Card className="p-12 bg-card border-border text-center">
										<p className="text-muted-foreground">Próximamente</p>
									</Card>
								)}
							</EditScope>
						</TabsContent>
					);
				})}

				{CASH_FLOW_TABS.filter(
					(tab) =>
						tab.value !== 'summary' &&
						tab.value !== 'bank-accounts' &&
						tab.value !== 'checking-accounts' &&
						tab.value !== 'suppliers' &&
						!(tab.value in CATEGORY_TABS)
				).map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="space-y-6">
						<CashFlowTabHeader value={tab.value} />
						<Card className="p-12 bg-card border-border text-center">
							<p className="text-muted-foreground">Próximamente</p>
						</Card>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
