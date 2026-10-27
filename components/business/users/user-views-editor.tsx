'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { VIEW_CATALOG, type ViewModule } from '@/constants/permissions/views';
import { isSuperadmin } from '@/constants/users/user-role';
import { getDefaultViews } from '@/helpers/permissions/views';
import { getDefaultEdits } from '@/helpers/permissions/edits';

export type UserPermissions = {
	/** null means the role defaults (for both lists, they are customized together). */
	views: string[] | null;
	edits: string[] | null;
};

interface UserViewsEditorProps {
	role: string;
	value: UserPermissions;
	onChange: (value: UserPermissions) => void;
}

const without = (list: string[], keys: string[]) => list.filter((key) => !keys.includes(key));

export function UserViewsEditor({ role, value, onChange }: UserViewsEditorProps) {
	if (!role) return null;

	if (isSuperadmin(role)) {
		return (
			<p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
				El Superadmin ve y edita todos los módulos y pestañas.
			</p>
		);
	}

	const isCustom = value.views !== null;
	const views = value.views ?? getDefaultViews(role);
	const edits = value.edits ?? getDefaultEdits(role);
	const set = (nextViews: string[], nextEdits: string[]) =>
		// Editing without seeing makes no sense, so an edit never outlives its view.
		onChange({ views: nextViews, edits: nextEdits.filter((key) => nextViews.includes(key)) });

	const toggleModuleView = (module: ViewModule, checked: boolean) => {
		const keys = [module.key, ...module.tabs.map((tab) => tab.key)];
		// Turning a module on opens all its tabs; the Superadmin then unticks what does not apply.
		set(checked ? [...without(views, keys), ...keys] : without(views, keys), edits);
	};

	const toggleView = (key: string, checked: boolean) =>
		set(checked ? [...views, key] : without(views, [key]), edits);

	// Ticking "Editar" also ticks "Ver", including the module a tab belongs to.
	const toggleEdit = (key: string, checked: boolean) => {
		const moduleKey = key.split('.')[0];
		const needed = [...new Set([moduleKey, key])];
		set(
			checked ? [...without(views, needed), ...needed] : views,
			checked ? [...without(edits, [key]), key] : without(edits, [key])
		);
	};

	const row = (key: string, label: string, isTab: boolean) => (
		<div
			key={key}
			className={`grid grid-cols-[1fr_3rem_3rem] items-center gap-2 ${isTab ? 'pl-6' : ''}`}
		>
			<span className={isTab ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}>
				{label}
			</span>
			<Checkbox
				className="justify-self-center"
				aria-label={`Ver ${label}`}
				checked={views.includes(key)}
				onCheckedChange={(checked) =>
					isTab
						? toggleView(key, checked === true)
						: toggleModuleView(
								VIEW_CATALOG.find((module) => module.key === key)!,
								checked === true
							)
				}
			/>
			<Checkbox
				className="justify-self-center"
				aria-label={`Editar ${label}`}
				checked={edits.includes(key) && views.includes(key)}
				onCheckedChange={(checked) => toggleEdit(key, checked === true)}
			/>
		</div>
	);

	return (
		<div className="grid gap-3 rounded-lg border border-border p-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-foreground">Vistas y permisos</p>
					<p className="text-xs text-muted-foreground">
						{isCustom
							? 'Personalizados para este usuario.'
							: `Usa los del rol ${role}. Apagalo para personalizarlos.`}
					</p>
				</div>
				<Switch
					checked={!isCustom}
					onCheckedChange={(useRole) =>
						onChange(
							useRole
								? { views: null, edits: null }
								: { views: getDefaultViews(role), edits: getDefaultEdits(role) }
						)
					}
					aria-label="Usar los permisos del rol"
				/>
			</div>

			{isCustom && (
				<div className="grid gap-2">
					<div className="grid grid-cols-[1fr_3rem_3rem] gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
						<span />
						<span className="text-center">Ver</span>
						<span className="text-center">Editar</span>
					</div>
					<div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
						{VIEW_CATALOG.map((module) => (
							<div key={module.key} className="grid gap-2">
								{row(module.key, module.label, false)}
								{views.includes(module.key) &&
									module.tabs.map((tab) => row(tab.key, tab.label, true))}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
