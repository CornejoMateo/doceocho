import { getSupabaseClient } from '../supabase-client';
import { BudgetWithWork } from '@/lib/balances/balances';

export type Budget = {
	id: number;
	created_at: string;
	folder_budget_id?: number | null;
	accepted?: boolean | null;
	sold?: boolean | null;
	lost?: boolean | null;
	date_of_sale?: string | null;
	pdf_url?: string | null;
	pdf_path?: string | null;
	number?: string | null;
	amount_ars?: number | null;
	amount_usd?: number | null;
	type?: string | null;
	usd_quote?: number | null;
};

export type BudgetWithWorkAndClient = BudgetWithWork & {
	client?: {
		id: number;
		name?: string | null;
		last_name?: string | null;
	} | null;
};

const TABLE = 'budgets';

export async function getBudgetsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
	return { data: count || 0, error };
}

// Este metodo tampoco se va a usar probablemente
export async function listBudgets(): Promise<{ data: Budget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getBudgetById(id: number): Promise<{ data: Budget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function getBudgetsByFolderBudgetId(
	folderBudgetId: number
): Promise<{ data: Budget[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('folder_budget_id', folderBudgetId)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getBudgetsByFolderBudgetIds(
	folderBudgetIds: number[]
): Promise<{ data: BudgetWithWork[] | null; error: any }> {
	const supabase = getSupabaseClient();
	if (folderBudgetIds.length === 0) return { data: [], error: null };

	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
				id,
				created_at,
				amount_ars,
				amount_usd,
				accepted,
				sold,
				lost,
				pdf_url,
				pdf_path,
				number,
				type,
				usd_quote,
				date_of_sale,
				folder_budget:folder_budgets!inner (
					id,
					work_id,
					work:works (
						address,
						locality
					)
				)
			`
		)
		.in('folder_budget_id', folderBudgetIds)
		.order('created_at', { ascending: false });

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const result: BudgetWithWork[] = data
		.map((b: any) => {
			const folderBudget = Array.isArray(b.folder_budget) ? b.folder_budget[0] : b.folder_budget;
			if (!folderBudget) return null;

			const work = Array.isArray(folderBudget.work) ? folderBudget.work[0] : folderBudget.work;

			return {
				id: b.id,
				created_at: b.created_at,
				amount_ars: b.amount_ars,
				amount_usd: b.amount_usd,
				accepted: b.accepted,
				sold: b.sold,
				lost: b.lost,
				pdf_url: b.pdf_url,
				pdf_path: b.pdf_path,
				number: b.number,
				type: b.type,
				usd_quote: b.usd_quote,
				date_of_sale: b.date_of_sale,
				folder_budget: {
					id: folderBudget.id,
					work_id: folderBudget.work_id,
					work: work
						? {
								address: work.address,
								locality: work.locality,
							}
						: null,
				},
			} as BudgetWithWork;
		})
		.filter((b): b is BudgetWithWork => b !== null);

	return { data: result, error: null };
}

export async function createBudget(
	budget: Omit<Budget, 'id' | 'pdf_url' | 'pdf_path'>,
	pdfFile: File | null,
	clientId: number
): Promise<{ data: Budget | null; error: any }> {
	const supabase = getSupabaseClient();
	let payload: any = { ...budget };
	let publicUrl: string | null = null;
	let filePath: string | null = null;

	if (pdfFile) {
		const sanitizePart = (value: string | null | undefined, fallback: string) => {
			const cleaned = (value ?? '')
				.trim()
				.replace(/\s+/g, '_')
				.replace(/[^a-zA-Z0-9._-]/g, '');
			return cleaned || fallback;
		};

		const sanitizedName = sanitizePart(pdfFile.name, 'archivo.pdf');
		const typePart = sanitizePart(budget.type, 'sin_tipo');
		const numberPart = sanitizePart(budget.number, 'sin_numero');
		const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const fileName = `budget_${typePart}_${numberPart}_${uniqueSuffix}_${sanitizedName}`;
		filePath = `${clientId}/${fileName}`;

		// Load the PDF file to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from('clients')
			.upload(filePath, pdfFile, { upsert: false });

		if (uploadError) {
			console.error('Error uploading PDF:', uploadError);
			return { data: null, error: uploadError };
		}

		// Get the public URL of the uploaded PDF
		const {
			data: { publicUrl: url },
		} = supabase.storage.from('clients').getPublicUrl(filePath);
		publicUrl = url;
	}

	payload = {
		...payload,
		pdf_url: publicUrl,
		pdf_path: filePath,
	};

	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();

	return { data, error };
}

export async function updateBudget(
	id: number,
	changes: Partial<Omit<Budget, 'id' | 'created_at'>>
): Promise<{ data: Budget | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function editBudget(
	id: number,
	changes: Partial<Omit<Budget, 'id'>>,
	pdfFile: File | null,
	clientId: number
): Promise<{ data: Budget | null; error: any }> {
	const supabase = getSupabaseClient();
	let payload: any = { ...changes };
	let publicUrl: string | null = null;
	let filePath: string | null = null;

	// Handle PDF update if provided
	if (pdfFile) {
		const sanitizedName = pdfFile.name.replace(/\s+/g, '_');
		const fileName = `budget_${changes.type || 'edit'}_${Date.now()}_${sanitizedName}`;
		filePath = `${clientId}/${fileName}`;

		// Upload the new PDF file to Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('clients')
			.upload(filePath, pdfFile);

		if (uploadError) {
			console.error('Error uploading PDF:', uploadError);
			return { data: null, error: uploadError };
		}

		// Get the public URL of the uploaded PDF
		const {
			data: { publicUrl: url },
		} = supabase.storage.from('clients').getPublicUrl(filePath);
		publicUrl = url;

		payload = {
			...payload,
			pdf_url: publicUrl,
			pdf_path: filePath,
		};
	}

	const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().single();

	return { data, error };
}

export async function deleteBudget(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}
