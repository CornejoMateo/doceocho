'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettlementTab } from './settlement-tab';
import { SettlementsListTab } from './settlements-list-tab';
import { User } from '@/lib/users/users';

interface ModulesSettlementsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	users?: User[];
}

export function ModulesSettlementsModal({
	open,
	onOpenChange,
	users = [],
}: ModulesSettlementsModalProps) {
	const [activeTab, setActiveTab] = useState<'liquidar' | 'liquidaciones'>('liquidar');

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-full sm:max-w-[600px] h-auto">
				<DialogHeader>
					<DialogTitle>Liquidaciones de módulos</DialogTitle>
					<DialogDescription>Gestiona las liquidaciones de módulos aprobados</DialogDescription>
				</DialogHeader>
				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as 'liquidar' | 'liquidaciones')}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="liquidar">Liquidar</TabsTrigger>
						<TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
					</TabsList>
					<TabsContent value="liquidar">
						<SettlementTab users={users} onLiquidated={() => setActiveTab('liquidaciones')} />
					</TabsContent>
					<TabsContent value="liquidaciones">
						<SettlementsListTab />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
