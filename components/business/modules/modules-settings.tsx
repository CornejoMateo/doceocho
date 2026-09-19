'use client';

import { useState, useEffect, useCallback } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getModulesSettings, updateModulesSettings } from '@/lib/modules/modules-settings';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrencyWithoutSymbol, formatNumber, parseArsToNumber } from '@/utils/formats-money';

interface ModulesSettingsProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ModulesSettings({ open, onOpenChange }: ModulesSettingsProps) {
	const [pricePerModule, setPricePerModule] = useState<string>('0.00');
	const [adminLoading, setAdminLoading] = useState(false);
	const [loadingSettings, setLoadingSettings] = useState(false);

	const [settingsLoadError, setSettingsLoadError] = useState(false);

	const loadSettings = useCallback(async () => {
		setLoadingSettings(true);
		setSettingsLoadError(false);
		try {
			const { data: settings, error } = await getModulesSettings();
			if (error) {
				setSettingsLoadError(true);
				toast({
					title: 'Error',
					description:
						translateError(error) || 'No se pudo cargar la configuración actual de módulos.',
					variant: 'destructive',
				});
				return;
			}
			if (settings?.price_per_module !== null && settings?.price_per_module !== undefined) {
				setPricePerModule(formatCurrencyWithoutSymbol(settings.price_per_module));
			} else {
				setPricePerModule('0.00');
			}
		} finally {
			setLoadingSettings(false);
		}
	}, []);

	const handleAdminSave = async () => {
		const pricePerModuleValue = parseArsToNumber(pricePerModule);

		if (isNaN(pricePerModuleValue) || pricePerModuleValue < 0) {
			toast({
				title: 'Error',
				description: 'El precio predeterminado debe ser un valor válido',
				variant: 'destructive',
			});
			return;
		}

		setAdminLoading(true);
		try {
			const { error } = await updateModulesSettings({
				price_per_module: pricePerModuleValue,
			});

			if (error) {
				toast({
					title: 'Error',
					description: translateError(error) || 'No se pudo guardar la configuración',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Configuración guardada',
					description: 'La configuración se actualizó correctamente',
				});
				onOpenChange(false);
			}
		} finally {
			setAdminLoading(false);
		}
	};

	useEffect(() => {
		if (open) {
			loadSettings();
		}
	}, [open, loadSettings]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configuración de Módulos</DialogTitle>
					<DialogDescription>Configura los parámetros del sistema de módulos</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{loadingSettings ? (
						<div className="flex items-center justify-center h-[200px]">
							<Spinner className="h-6 w-6 text-muted-foreground" />
						</div>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Precio por Módulo</CardTitle>
								<CardDescription className="text-sm">
									Configura el precio predeterminado que se sugiere al aprobar un módulo
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="price-per-module" className="text-sm">
										Precio predeterminado
									</Label>
									<Input
										id="price-per-module"
										type="text"
										value={pricePerModule}
										onChange={(e) => setPricePerModule(formatNumber(e.target.value))}
										placeholder="0.00"
										className="text-base"
									/>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
				<DialogFooter>
					<Button
						onClick={handleAdminSave}
						disabled={adminLoading || loadingSettings || settingsLoadError}
						className="w-full"
					>
						{adminLoading ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
