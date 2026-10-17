import { getSupabaseClient } from '../supabase-client';
import { normalizeMoney } from '../../utils/formats-money';
import { fetchAllPages, fetchByIdsInChunks } from './pagination';

export type PaymentSupplier = {
	id: number;
	created_at: string;
	paid_date: string;
	amount_ars: number;
	receipt_number: string | null;
	work_id: number | null;
	category_id: number | null;
	bank_account_id: number | null;
	payment_method_id: number | null;
	purchase_supplier_id: number;
	notes: string | null;
};

export type PaymentSupplierInput = Partial<
	Pick<PaymentSupplier, 'paid_date' | 'receipt_number' | 'work_id' | 'category_id'>
> &
	Omit<
		PaymentSupplier,
		'id' | 'created_at' | 'paid_date' | 'receipt_number' | 'work_id' | 'category_id'
	>;

export type PaymentSupplierWithDetails = PaymentSupplier & {
	supplier_id: number;
	supplier_name: string;
	work_name: string | null;
	category_name: string | null;
	payment_method_name: string | null;
	bank_account_name: string | null;
};

const TABLE = 'payments_suppliers';
const SELECT_WITH_DETAILS =
	'*, purchases_suppliers(supplier_id, suppliers(name)), works(name), cash_flow_categories(name), payment_methods(name), bank_accounts(name, bank)';

function mapRowWithDetails(row: any): PaymentSupplierWithDetails {
	const {
		purchases_suppliers,
		works,
		cash_flow_categories,
		payment_methods,
		bank_accounts,
		...rest
	} = row;
	return {
		...rest,
		amount_ars: normalizeMoney(Number(row.amount_ars)),
		supplier_id: purchases_suppliers?.supplier_id ?? 0,
		supplier_name: purchases_suppliers?.suppliers?.name ?? '',
		work_name: works?.name ?? null,
		category_name: cash_flow_categories?.name ?? null,
		payment_method_name: payment_methods?.name ?? null,
		bank_account_name: bank_accounts ? `${bank_accounts.bank} - ${bank_accounts.name}` : null,
	};
}

export async function listPaymentsSuppliers(purchaseSupplierId?: number): Promise<{
	data: PaymentSupplier[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	let query = supabase
		.from(TABLE)
		.select('*')
		.order('paid_date', { ascending: false })
		.order('created_at', { ascending: false });

	if (purchaseSupplierId) {
		query = query.eq('purchase_supplier_id', purchaseSupplierId);
	}

	const { data, error } = await query;
	return { data, error };
}

export async function listPaymentsSuppliersByPurchaseIds(purchaseIds: number[]): Promise<{
	data: PaymentSupplier[] | null;
	error: any;
}> {
	return fetchByIdsInChunks(purchaseIds, (chunk) =>
		fetchAllPages<PaymentSupplier>((from, to) => {
			const supabase = getSupabaseClient();
			return supabase
				.from(TABLE)
				.select('*')
				.in('purchase_supplier_id', chunk)
				.order('paid_date', { ascending: false })
				.order('created_at', { ascending: false })
				.order('id', { ascending: false })
				.range(from, to);
		})
	);
}

export async function listPaymentsSuppliersForYear(year: number): Promise<{
	data: PaymentSupplierWithDetails[] | null;
	error: any;
}> {
	const { data, error } = await fetchAllPages<any>((from, to) => {
		const supabase = getSupabaseClient();
		return supabase
			.from(TABLE)
			.select(SELECT_WITH_DETAILS)
			.gte('paid_date', `${year}-01-01`)
			.lt('paid_date', `${year + 1}-01-01`)
			.order('paid_date', { ascending: false })
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.range(from, to);
	});
	if (error) return { data: null, error };
	return { data: (data ?? []).map(mapRowWithDetails), error: null };
}

export async function createPaymentSupplier(
	paymentSupplier: PaymentSupplierInput
): Promise<{ data: PaymentSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(paymentSupplier).select().single();
	return { data, error };
}

export async function updatePaymentSupplier(
	id: number,
	updates: Partial<PaymentSupplierInput>
): Promise<{ data: PaymentSupplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
	return { data, error };
}

const STORAGE_REMOVE_CHUNK_SIZE = 100;

export async function deletePaymentSupplier(
	id: number
): Promise<{ error: any; orphanedPaths?: string[] }> {
	const supabase = getSupabaseClient();

	const { data: storagePaths, error: rpcError } = await supabase.rpc('delete_payment_supplier', {
		p_id: id,
	});

	if (rpcError) {
		return { error: rpcError };
	}

	const paths = (storagePaths ?? []).filter((p: unknown): p is string => !!p);
	const orphanedPaths: string[] = [];

	for (let i = 0; i < paths.length; i += STORAGE_REMOVE_CHUNK_SIZE) {
		const chunk = paths.slice(i, i + STORAGE_REMOVE_CHUNK_SIZE);
		const { error: storageError } = await supabase.storage.from('suppliers-files').remove(chunk);
		if (storageError) {
			console.error('Failed to remove payment supplier storage objects:', chunk, storageError);
			orphanedPaths.push(...chunk);
		}
	}

	return { error: null, ...(orphanedPaths.length > 0 ? { orphanedPaths } : {}) };
}
