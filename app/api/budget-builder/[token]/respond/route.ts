import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/get-service-role-client';
import { isBudgetToken, parseClientResponse } from '@/helpers/budget-builder/client-response';
import { budgetCode } from '@/helpers/budget-builder/calculate';
import { sendBudgetResponseNotification } from '@/lib/push/send-budget-response-notification';

export const dynamic = 'force-dynamic';

/** The client approves or rejects from their link. Recorded once; the budget status follows. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await params;

		if (!isBudgetToken(token)) {
			return NextResponse.json({ error: 'Link inválido' }, { status: 400 });
		}

		const parsed = parseClientResponse(await req.json().catch(() => null));

		if ('error' in parsed) {
			return NextResponse.json({ error: parsed.error }, { status: 400 });
		}

		const supabase = getServiceRoleClient();
		const respondedAt = new Date().toISOString();

		// Only an unanswered budget changes, so a second click or an old tab cannot overwrite the answer.
		const { data: budget, error } = await supabase
			.from('budget_builder_budgets')
			.update({
				client_response: parsed.decision,
				client_comment: parsed.comment,
				responded_at: respondedAt,
				status: parsed.decision,
			})
			.eq('public_token', token)
			.is('client_response', null)
			.select('id, number, client_name, linked_budget_id')
			.maybeSingle();

		if (error) {
			console.error('[budget-builder] Failed to save client response:', error);
			return NextResponse.json({ error: 'No pudimos guardar tu respuesta' }, { status: 500 });
		}

		if (!budget) {
			return NextResponse.json(
				{ error: 'Este presupuesto ya fue respondido o no existe' },
				{ status: 409 }
			);
		}

		// An approval also marks the PDF filed in the client's budgets tab as the chosen one.
		if (budget.linked_budget_id && parsed.decision === 'aprobado') {
			const { error: chosenError } = await supabase
				.from('budgets')
				.update({ accepted: true })
				.eq('id', budget.linked_budget_id);
			if (chosenError) console.error('[budget-builder] Failed to mark client budget:', chosenError);
		}

		// A failed push must not lose the answer that is already saved.
		try {
			await sendBudgetResponseNotification(
				supabase,
				budgetCode(budget),
				budget.client_name,
				parsed.decision,
				budget.id
			);
		} catch (pushError) {
			console.error('[budget-builder] Failed to notify admins:', pushError);
		}

		return NextResponse.json({
			response: { decision: parsed.decision, comment: parsed.comment, respondedAt },
		});
	} catch (error) {
		console.error('[budget-builder] Failed to handle client response:', error);
		return NextResponse.json({ error: 'Error al guardar tu respuesta' }, { status: 500 });
	}
}
