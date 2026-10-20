import { FORMULA_VARIABLES } from '@/helpers/budget-builder/geometry';

/** Reminder of what a quantity can use, so nobody has to remember variable names. */
export function FormulaHelp() {
	return (
		<div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
			<p className="mb-2">
				La cantidad puede ser un número o una fórmula que sigue las medidas, por ejemplo{' '}
				<code className="text-foreground">superficie * 1.1</code> o{' '}
				<code className="text-foreground">arriba(patas * 4)</code>.
			</p>
			<div className="flex flex-wrap gap-1">
				{FORMULA_VARIABLES.map((variable) => (
					<span
						key={variable.name}
						title={variable.description}
						className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground"
					>
						{variable.name}
					</span>
				))}
			</div>
		</div>
	);
}
