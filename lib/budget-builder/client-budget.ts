import { getSupabaseClient } from '@/lib/supabase-client';
import { createBudget, editBudget, getBudgetById } from '@/lib/budgets/budgets';
import { createFolderBudget, getFolderBudgetsByClientId } from '@/lib/budgets/folder_budgets';
import type { Budget, CompanyInfo } from '@/lib/budget-builder/types';
import { budgetCode } from '@/helpers/budget-builder/calculate';
import { toClientBudget } from '@/helpers/budget-builder/share';
import { buildBudgetPdf } from '@/helpers/budget-builder/pdf';

/** Shown as the budget type in the client's budgets tab, so they are told apart from uploaded ones. */
export const CLIENT_BUDGET_TYPE = 'Presupuestador';

const BUDGETS_TABLE = 'budget_builder_budgets';
const CLIENTS_BUCKET = 'clients';

/** The client's folder for budgets without a work, created the first time it is needed. */
async function generalFolderId(clientId: number): Promise<{ id: number | null; error: any }> {
	const { data: folders, error } = await getFolderBudgetsByClientId(clientId);
	if (error) return { id: null, error };

	const existing = folders?.find((folder) => (folder.work_id ?? null) === null);
	if (existing) return { id: existing.id, error: null };

	const { data: folder, error: createError } = await createFolderBudget({
		client_id: clientId,
		work_id: null,
	});
	return { id: folder?.id ?? null, error: createError };
}

/**
 * Files the budget's PDF in the client's budgets tab, the same place a hand-uploaded one goes.
 * The first time it creates the entry; afterwards it replaces that same entry's PDF and amount,
 * so sending a corrected version never leaves duplicates behind.
 */
export async function fileBudgetInClient(
	budget: Budget,
	company: CompanyInfo
): Promise<{ linkedBudgetId: number | null; error: any }> {
	if (!budget.clientId) return { linkedBudgetId: null, error: null };

	const data = toClientBudget(budget, company);
	const code = budgetCode(budget);
	const pdf = new File([buildBudgetPdf(data).output('blob')], `${code}.pdf`, {
		type: 'application/pdf',
	});
	const fields = { number: code, type: CLIENT_BUDGET_TYPE, amount_ars: data.total };

	// The entry may have been deleted from the client's tab; then a new one is made.
	if (budget.linkedBudgetId) {
		const { data: existing } = await getBudgetById(budget.linkedBudgetId);

		if (existing) {
			const { error } = await editBudget(existing.id, fields, pdf, budget.clientId);
			if (error) return { linkedBudgetId: null, error };

			if (existing.pdf_path) {
				await getSupabaseClient().storage.from(CLIENTS_BUCKET).remove([existing.pdf_path]);
			}
			return { linkedBudgetId: existing.id, error: null };
		}
	}

	const folder = await generalFolderId(budget.clientId);
	if (!folder.id) return { linkedBudgetId: null, error: folder.error };

	const { data: created, error } = await createBudget(
		{
			...fields,
			folder_budget_id: folder.id,
			accepted: false,
			sold: false,
			lost: false,
			amount_usd: null,
			usd_quote: null,
			created_at: new Date().toISOString(),
		},
		pdf,
		budget.clientId
	);
	if (error || !created) return { linkedBudgetId: null, error };

	const { error: linkError } = await getSupabaseClient()
		.from(BUDGETS_TABLE)
		.update({ linked_budget_id: created.id })
		.eq('id', budget.id);

	return { linkedBudgetId: created.id, error: linkError };
}
