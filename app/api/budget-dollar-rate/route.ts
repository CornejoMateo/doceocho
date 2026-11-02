import { NextResponse } from 'next/server';
import { authorize } from '@/helpers/users/require-permission';
import { API_PERMISSIONS } from '@/constants/permissions/views';
import { isBudgetLocked } from '@/constants/budgets/budget-status';

interface BudgetDollarRateRequest {
	budgetId?: number;
	clientId?: string;
	newUsdRate: number;
}

export async function POST(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.budgetDollarRate);
		if ('response' in auth) return auth.response;
		const { supabase } = auth;

		const body: BudgetDollarRateRequest = await req.json();

		const { budgetId, clientId, newUsdRate } = body;

		if (!newUsdRate) {
			return NextResponse.json({ error: 'Faltan datos requeridos: newUsdRate' }, { status: 400 });
		}

		if (!budgetId && !clientId) {
			return NextResponse.json({ error: 'Debe proporcionar budgetId o clientId' }, { status: 400 });
		}

		// Validate USD rate is positive
		if (newUsdRate <= 0) {
			return NextResponse.json(
				{ error: 'El tipo de cambio debe ser un valor positivo' },
				{ status: 400 }
			);
		}

		let budgetsToUpdate;
		let excludedLockedBudgets = 0;
		let totalBudgets = 0;

		if (budgetId) {
			// Single budget update
			const { data: existingBudget, error: fetchError } = await supabase
				.from('budgets')
				.select('*')
				.eq('id', budgetId)
				.single();

			if (fetchError) {
				console.error('Error fetching budget:', fetchError);
				return NextResponse.json(
					{ error: 'No se encontró el presupuesto especificado' },
					{ status: 404 }
				);
			}

			if (!existingBudget) {
				return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
			}

			// Check if budget is locked (sold or accepted)
			if (isBudgetLocked(existingBudget)) {
				return NextResponse.json(
					{
						error: 'No se puede actualizar un presupuesto que está marcado como vendido o elegido',
						budgetStatus: {
							sold: existingBudget.sold,
							accepted: existingBudget.accepted,
						},
					},
					{ status: 403 }
				);
			}

			budgetsToUpdate = [existingBudget];
		} else if (clientId) {
			// Multiple budgets update for client
			const { data: clientBudgets, error: fetchError } = await supabase
				.from('budgets')
				.select(
					`
          *,
          folder_budget:folder_budgets!inner (
            client_id
          )
        `
				)
				.eq('folder_budget.client_id', clientId)
				.not('amount_usd', 'is', null)
				.gt('amount_usd', 0);

			if (fetchError) {
				console.error('Error fetching client budgets:', fetchError);
				return NextResponse.json(
					{ error: 'No se pudieron obtener los presupuestos del cliente' },
					{ status: 500 }
				);
			}

			// Filter out locked budgets (sold or accepted)
			const allBudgets = clientBudgets || [];
			const lockedBudgets = allBudgets.filter(isBudgetLocked);
			const updatableBudgets = allBudgets.filter((budget) => !isBudgetLocked(budget));

			excludedLockedBudgets = lockedBudgets.length;
			totalBudgets = allBudgets.length;

			if (lockedBudgets.length > 0) {
				console.log(`Excluding ${lockedBudgets.length} locked budget(s) from update`);
			}

			budgetsToUpdate = updatableBudgets;
		} else {
			return NextResponse.json(
				{ error: 'No se especificó qué presupuestos actualizar' },
				{ status: 400 }
			);
		}

		if (budgetsToUpdate.length === 0) {
			return NextResponse.json(
				{
					error: 'No se encontraron presupuestos actualizables con monto USD',
					details: clientId
						? {
								message:
									'Todos los presupuestos del cliente están marcados como vendidos o elegidos, o no tienen monto USD',
								hint: 'Solo se pueden actualizar presupuestos que no estén vendidos ni elegidos',
							}
						: {
								message: 'El presupuesto no se puede actualizar',
								hint: 'Verifique que el presupuesto no esté marcado como vendido o elegido',
							},
				},
				{ status: 404 }
			);
		}

		// Update all budgets
		const updatePromises = budgetsToUpdate.map(async (budget) => {
			const budgetInUSD = budget.amount_usd || 0;
			const newBudgetInARS = budgetInUSD * newUsdRate;

			return supabase
				.from('budgets')
				.update({
					amount_ars: newBudgetInARS,
				})
				.eq('id', budget.id)
				.select()
				.single();
		});

		const updateResults = await Promise.all(updatePromises);
		const errors = updateResults.filter((result) => result.error);

		if (errors.length > 0) {
			console.error('Error updating some budgets:', errors);
			return NextResponse.json(
				{ error: `Error al actualizar ${errors.length} presupuesto(s)` },
				{ status: 500 }
			);
		}

		const successfulUpdates = updateResults.map((result) => result.data);

		return NextResponse.json({
			success: true,
			message: budgetId
				? 'Precio del presupuesto actualizado exitosamente'
				: `${successfulUpdates.length} presupuesto(s) actualizado(s) exitosamente`,
			data: {
				updatedBudgets: successfulUpdates,
				newUsdRate,
				updatedCount: successfulUpdates.length,
				...(clientId && {
					excludedLockedBudgets,
					totalBudgets,
				}),
			},
		});
	} catch (err: any) {
		console.error('Error en API budget-dollar-rate:', err);
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}
