import Image from 'next/image';

/** Standalone shell for the public pages: no sidebar, no session, no app data. */
export function PublicAppointmentsLayout({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card">
				<div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
					<Image
						src="/logo-doce8.png"
						alt="Doce Ocho"
						width={48}
						height={48}
						style={{ height: 'auto' }}
					/>
					<span className="font-semibold text-foreground">Doce Ocho</span>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-4 py-8">
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-foreground">{title}</h1>
					{subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
				</div>
				{children}
			</main>
		</div>
	);
}
