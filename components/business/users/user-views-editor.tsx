'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { VIEW_CATALOG, type ViewModule } from '@/constants/permissions/views';
import { isSuperadmin } from '@/constants/users/user-role';
import { getDefaultViews } from '@/helpers/permissions/views';

interface UserViewsEditorProps {
	role: string;
	/** null means the role defaults. */
	views: string[] | null;
	onChange: (views: string[] | null) => void;
}

export function UserViewsEditor({ role, views, onChange }: UserViewsEditorProps) {
	if (!role) return null;

	if (isSuperadmin(role)) {
		return (
			<p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
				El Superadmin ve todos los módulos y pestañas.
			</p>
		);
	}

	const isCustom = views !== null;
	const selected = views ?? getDefaultViews(role);

	const toggleModule = (module: ViewModule, checked: boolean) => {
		const moduleKeys = [module.key, ...module.tabs.map((tab) => tab.key)];
		const rest = selected.filter((key) => !moduleKeys.includes(key));

		// Turning a module on opens all its tabs; the Superadmin then unticks what does not apply.
		onChange(checked ? [...rest, ...moduleKeys] : rest);
	};

	const toggleTab = (key: string, checked: boolean) => {
		onChange(checked ? [...selected, key] : selected.filter((current) => current !== key));
	};

	return (
		<div className="grid gap-3 rounded-lg border border-border p-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-foreground">Vistas</p>
					<p className="text-xs text-muted-foreground">
						{isCustom
							? 'Personalizadas para este usuario.'
							: `Usa las vistas del rol ${role}. Apagalo para personalizarlas.`}
					</p>
				</div>
				<Switch
					checked={!isCustom}
					onCheckedChange={(useRole) => onChange(useRole ? null : getDefaultViews(role))}
					aria-label="Usar las vistas del rol"
				/>
			</div>

			{isCustom && (
				<div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
					{VIEW_CATALOG.map((module) => {
						const moduleOn = selected.includes(module.key);

						return (
							<div key={module.key} className="grid gap-2">
								<div className="flex items-center gap-2">
									<Checkbox
										id={`view-${module.key}`}
										checked={moduleOn}
										onCheckedChange={(checked) => toggleModule(module, checked === true)}
									/>
									<Label htmlFor={`view-${module.key}`} className="text-sm text-foreground">
										{module.label}
									</Label>
								</div>

								{moduleOn && module.tabs.length > 0 && (
									<div className="ml-6 grid gap-2 sm:grid-cols-2">
										{module.tabs.map((tab) => (
											<div key={tab.key} className="flex items-center gap-2">
												<Checkbox
													id={`view-${tab.key}`}
													checked={selected.includes(tab.key)}
													onCheckedChange={(checked) => toggleTab(tab.key, checked === true)}
												/>
												<Label
													htmlFor={`view-${tab.key}`}
													className="text-xs text-muted-foreground"
												>
													{tab.label}
												</Label>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
