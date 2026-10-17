'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useGlobalSearch } from '@/hooks/search/use-global-search';
import { MIN_SEARCH_LENGTH, SEARCH_SHORTCUT_KEY } from '@/constants/search/search';
import type { SearchResult } from '@/lib/search/types';

function useShortcutLabel(): string {
	const [label, setLabel] = useState('Ctrl K');

	// Resolved after mount so the server and the browser render the same markup.
	useEffect(() => {
		if (navigator.userAgent.includes('Mac')) setLabel('⌘ K');
	}, []);

	return label;
}

export function GlobalSearch() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const shortcutLabel = useShortcutLabel();

	const { term, setTerm, groups, isSearching, hasError, hasResults, isTermTooShort, reset } =
		useGlobalSearch();

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key.toLowerCase() !== SEARCH_SHORTCUT_KEY) return;
			if (!event.metaKey && !event.ctrlKey) return;

			event.preventDefault();
			setOpen((previous) => !previous);
		}

		window.addEventListener('keydown', handleKeyDown);

		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);

			// Dropping the term also cancels any request still in flight.
			if (!nextOpen) reset();
		},
		[reset]
	);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			handleOpenChange(false);
			router.push(result.href);
		},
		[handleOpenChange, router]
	);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="gap-2 text-muted-foreground sm:w-56 sm:justify-start"
				aria-label="Buscar en el sistema"
			>
				<Search className="h-4 w-4 shrink-0" />
				<span className="hidden sm:inline">Buscar...</span>
				<kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-medium sm:inline">
					{shortcutLabel}
				</kbd>
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="overflow-hidden p-0" showCloseButton={false}>
					<DialogTitle className="sr-only">Buscar en el sistema</DialogTitle>
					<DialogDescription className="sr-only">
						Buscá clientes, obras, insumos y secciones del sistema
					</DialogDescription>

					{/* Filtering happens in the providers, so cmdk must not filter again. */}
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Buscar clientes, obras, insumos..."
							value={term}
							onValueChange={setTerm}
						/>

						<CommandList className="max-h-[60vh]">
							{isTermTooShort && (
								<CommandEmpty>
									Escribí al menos {MIN_SEARCH_LENGTH} letras para buscar.
								</CommandEmpty>
							)}

							{!isTermTooShort && isSearching && (
								<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
									<Spinner className="h-4 w-4" />
									Buscando...
								</div>
							)}

							{!isTermTooShort && !isSearching && hasError && (
								<CommandEmpty>No pudimos buscar. Probá de nuevo en unos segundos.</CommandEmpty>
							)}

							{!isTermTooShort && !isSearching && !hasError && term.trim() && !hasResults && (
								<CommandEmpty>No encontramos nada con &quot;{term.trim()}&quot;.</CommandEmpty>
							)}

							{!isSearching &&
								groups.map((group) => (
									<CommandGroup key={group.providerId} heading={group.label}>
										{group.results.map((result) => (
											<CommandItem
												key={result.id}
												value={result.id}
												onSelect={() => handleSelect(result)}
												className="gap-3"
											>
												<result.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm text-foreground">{result.title}</p>
													{result.subtitle && (
														<p className="truncate text-xs text-muted-foreground">
															{result.subtitle}
														</p>
													)}
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								))}
						</CommandList>
					</Command>
				</DialogContent>
			</Dialog>
		</>
	);
}
