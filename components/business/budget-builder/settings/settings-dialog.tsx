'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BudgetBuilderSettings, CompanyInfo } from '@/lib/budget-builder/types';
import { CatalogSettings } from '@/components/business/budget-builder/settings/catalog-settings';
import { TemplatesSettings } from '@/components/business/budget-builder/settings/templates-settings';
import { FinishesSettings } from '@/components/business/budget-builder/settings/finishes-settings';

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: BudgetBuilderSettings;
	onChange: (settings: BudgetBuilderSettings) => void;
}

const COMPANY_FIELDS: { key: keyof CompanyInfo; label: string; placeholder: string }[] = [
	{ key: 'name', label: 'Nombre', placeholder: 'Doce Ocho' },
	{ key: 'phone', label: 'WhatsApp (con código de país)', placeholder: '5493584000000' },
	{ key: 'email', label: 'Email', placeholder: 'ventas@empresa.com' },
	{ key: 'address', label: 'Dirección', placeholder: 'Calle 123, Río Cuarto' },
];

/** Changes save as they are made, like the rest of the module. */
export function SettingsDialog({ open, onOpenChange, settings, onChange }: SettingsDialogProps) {
	const setCompany = (changes: Partial<CompanyInfo>) =>
		onChange({ ...settings, company: { ...settings.company, ...changes } });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl max-h-[92dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configuración del presupuestador</DialogTitle>
					<DialogDescription>Los cambios se guardan solos.</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="catalog" className="space-y-4">
					<TabsList className="flex-wrap h-auto justify-start gap-1">
						<TabsTrigger value="catalog">Insumos y precios</TabsTrigger>
						<TabsTrigger value="templates">Tipos de mueble</TabsTrigger>
						<TabsTrigger value="finishes">Terminaciones</TabsTrigger>
						<TabsTrigger value="company">Empresa</TabsTrigger>
					</TabsList>

					<TabsContent value="catalog">
						<CatalogSettings
							catalog={settings.catalog}
							onChange={(catalog) => onChange({ ...settings, catalog })}
						/>
					</TabsContent>

					<TabsContent value="templates">
						<TemplatesSettings
							templates={settings.templates}
							catalog={settings.catalog}
							onChange={(templates) => onChange({ ...settings, templates })}
						/>
					</TabsContent>

					<TabsContent value="finishes">
						<FinishesSettings
							finishes={settings.finishes}
							onChange={(finishes) => onChange({ ...settings, finishes })}
						/>
					</TabsContent>

					<TabsContent value="company" className="space-y-4">
						<p className="text-xs text-muted-foreground">
							Aparece en el PDF y en la página que recibe el cliente. El WhatsApp es adonde llega la
							aprobación.
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							{COMPANY_FIELDS.map((field) => (
								<div key={field.key} className="grid gap-1">
									<Label htmlFor={`company-${field.key}`}>{field.label}</Label>
									<Input
										id={`company-${field.key}`}
										value={settings.company[field.key]}
										placeholder={field.placeholder}
										onChange={(event) => setCompany({ [field.key]: event.target.value })}
									/>
								</div>
							))}
							<div className="grid gap-1">
								<Label htmlFor="default-margin">Ganancia por defecto (%)</Label>
								<Input
									id="default-margin"
									type="number"
									min={0}
									value={settings.defaultMarginPercent}
									onChange={(event) =>
										onChange({ ...settings, defaultMarginPercent: Number(event.target.value) || 0 })
									}
								/>
							</div>
							<div className="grid gap-1">
								<Label htmlFor="default-validity">Validez por defecto (días)</Label>
								<Input
									id="default-validity"
									type="number"
									min={1}
									value={settings.defaultValidityDays}
									onChange={(event) =>
										onChange({ ...settings, defaultValidityDays: Number(event.target.value) || 1 })
									}
								/>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
