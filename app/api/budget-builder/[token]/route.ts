import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/get-service-role-client';
import { isBudgetToken } from '@/helpers/budget-builder/client-response';
import { toClientBudget } from '@/helpers/budget-builder/share';
import { loadPublicBudget } from '@/lib/budget-builder/public-budget';

export const dynamic = 'force-dynamic';

/** What the client's link shows: final prices only, never costs, lines or margin. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await params;

		if (!isBudgetToken(token)) {
			return NextResponse.json({ error: 'Link inválido' }, { status: 400 });
		}

		const found = await loadPublicBudget(getServiceRoleClient(), token);

		if (!found) {
			return NextResponse.json({ error: 'No encontramos este presupuesto' }, { status: 404 });
		}

		const { budget, company } = found;

		return NextResponse.json({
			budget: toClientBudget(budget, company),
			response: budget.clientResponse
				? {
						decision: budget.clientResponse,
						comment: budget.clientComment,
						respondedAt: budget.respondedAt,
					}
				: null,
		});
	} catch (error) {
		console.error('[budget-builder] Failed to load public budget:', error);
		return NextResponse.json({ error: 'Error al cargar el presupuesto' }, { status: 500 });
	}
}
