import { getSupabaseClient } from '@/lib/supabase-client';
import type {
	Budget,
	BudgetBuilderSettings,
	CatalogItem,
	CompanyInfo,
	Finish,
	FurnitureTemplate,
} from '@/lib/budget-builder/types';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import { diffById } from '@/helpers/budget-builder/sync';

const SETTINGS_TABLE = 'budget_builder_settings';
const CATALOG_TABLE = 'budget_builder_catalog';
const TEMPLATES_TABLE = 'budget_builder_templates';
const BUDGETS_TABLE = 'budget_builder_budgets';
const SETTINGS_ID = 1;

type BudgetRow = {
	id: string;
	number: number;
	created_at: string;
	client_name: string;
	client_contact: string;
	status: Budget['status'];
	margin_percent: number;
	validity_days: number;
	notes: string;
	items: Budget['items'];
	public_token: string;
	client_response: Budget['clientResponse'];
	client_comment: string | null;
	responded_at: string | null;
	client_id: number | null;
	linked_budget_id: number | null;
};

export function budgetFromRow(row: BudgetRow): Budget {
	return {
		id: row.id,
		number: row.number,
		createdAt: row.created_at,
		clientName: row.client_name,
		clientContact: row.client_contact,
		status: row.status,
		marginPercent: Number(row.margin_percent),
		validityDays: row.validity_days,
		notes: row.notes,
		items: row.items ?? [],
		publicToken: row.public_token,
		clientResponse: row.client_response,
		clientComment: row.client_comment,
		respondedAt: row.responded_at,
		clientId: row.client_id ?? null,
		linkedBudgetId: row.linked_budget_id ?? null,
	};
}

/** Only what the seller edits; number, token and the client's answer are never written from here. */
function budgetToRow(budget: Partial<Budget>) {
	return {
		client_name: budget.clientName,
		client_contact: budget.clientContact,
		status: budget.status,
		margin_percent: budget.marginPercent,
		validity_days: budget.validityDays,
		notes: budget.notes,
		items: budget.items,
		client_id: budget.clientId,
	};
}

export async function loadSettings(): Promise<{ data: BudgetBuilderSettings | null; error: any }> {
	const supabase = getSupabaseClient();

	const [settings, catalog, templates] = await Promise.all([
		supabase.from(SETTINGS_TABLE).select('*').eq('id', SETTINGS_ID).maybeSingle(),
		supabase.from(CATALOG_TABLE).select('*').order('position').order('created_at'),
		supabase.from(TEMPLATES_TABLE).select('*').order('position').order('created_at'),
	]);

	const error = settings.error ?? catalog.error ?? templates.error;
	if (error) return { data: null, error };

	return {
		data: {
			company: { ...DEFAULT_SETTINGS.company, ...(settings.data?.company as CompanyInfo) },
			defaultMarginPercent: Number(
				settings.data?.default_margin_percent ?? DEFAULT_SETTINGS.defaultMarginPercent
			),
			defaultValidityDays:
				settings.data?.default_validity_days ?? DEFAULT_SETTINGS.defaultValidityDays,
			// Never saved yet means the built-in finishes; an empty list is a real choice.
			finishes: (settings.data?.finishes as Finish[] | null) ?? DEFAULT_SETTINGS.finishes,
			catalog: (catalog.data ?? []).map((row) => ({
				id: row.id,
				name: row.name,
				category: row.category,
				unit: row.unit,
				price: Number(row.price),
			})),
			templates: (templates.data ?? []).map((row) => ({
				id: row.id,
				name: row.name,
				shape: row.shape,
				dimensions: row.dimensions,
				lines: row.lines ?? [],
			})),
		},
		error: null,
	};
}

/** Saves only what differs from the last saved version, so typing a price is one small write. */
export async function saveSettings(
	previous: BudgetBuilderSettings,
	next: BudgetBuilderSettings
): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const writes: PromiseLike<{ error: any }>[] = [];

	if (
		JSON.stringify(previous.company) !== JSON.stringify(next.company) ||
		previous.defaultMarginPercent !== next.defaultMarginPercent ||
		previous.defaultValidityDays !== next.defaultValidityDays ||
		JSON.stringify(previous.finishes) !== JSON.stringify(next.finishes)
	) {
		writes.push(
			supabase.from(SETTINGS_TABLE).upsert({
				id: SETTINGS_ID,
				company: next.company,
				default_margin_percent: next.defaultMarginPercent,
				default_validity_days: next.defaultValidityDays,
				finishes: next.finishes,
			})
		);
	}

	const catalog = diffById<CatalogItem>(previous.catalog, next.catalog);
	if (catalog.upserts.length) {
		writes.push(
			supabase
				.from(CATALOG_TABLE)
				.upsert(catalog.upserts.map(({ item, position }) => ({ ...item, position })))
		);
	}
	if (catalog.deletes.length) {
		writes.push(supabase.from(CATALOG_TABLE).delete().in('id', catalog.deletes));
	}

	const templates = diffById<FurnitureTemplate>(previous.templates, next.templates);
	if (templates.upserts.length) {
		writes.push(
			supabase
				.from(TEMPLATES_TABLE)
				.upsert(templates.upserts.map(({ item, position }) => ({ ...item, position })))
		);
	}
	if (templates.deletes.length) {
		writes.push(supabase.from(TEMPLATES_TABLE).delete().in('id', templates.deletes));
	}

	const results = await Promise.all(writes);
	return { error: results.find((result) => result.error)?.error ?? null };
}

export async function listBudgets(): Promise<{ data: Budget[]; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(BUDGETS_TABLE)
		.select('*')
		.order('created_at', { ascending: false });

	return { data: (data ?? []).map(budgetFromRow), error };
}

/** The database hands out the number and the client's token. */
export async function createBudget(
	fields: Partial<Budget>
): Promise<{ data: Budget | null; error: any }> {
	const supabase = getSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data, error } = await supabase
		.from(BUDGETS_TABLE)
		.insert({ ...budgetToRow(fields), created_by: user?.id ?? null })
		.select('*')
		.single();

	return { data: data ? budgetFromRow(data) : null, error };
}

/**
 * Status only goes out when the seller changed it, so an editor left open
 * never overwrites the answer a client gave from their link in the meantime.
 */
export async function updateBudget(
	budget: Budget,
	{ includeStatus }: { includeStatus: boolean }
): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { status, ...row } = budgetToRow(budget);

	const { error } = await supabase
		.from(BUDGETS_TABLE)
		.update(includeStatus ? { ...row, status } : row)
		.eq('id', budget.id);

	return { error };
}

export async function deleteBudget(id: string): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.from(BUDGETS_TABLE).delete().eq('id', id);

	return { error };
}
