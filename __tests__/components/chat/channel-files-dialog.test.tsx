import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChannelFilesDialog } from '@/components/business/chat/channel-files-dialog';
import { ChannelWithLastMessage, ChannelFile } from '@/lib/chat/chat-types';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ children, open }: any) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
	AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock('lucide-react', () => ({
	Upload: (props: any) => <svg data-testid="icon-upload" {...props} />,
	Download: (props: any) => <svg data-testid="icon-download" {...props} />,
	Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
	Paperclip: (props: any) => <svg data-testid="icon-paperclip" {...props} />,
	Eye: (props: any) => <svg data-testid="icon-eye" {...props} />,
	AlertCircle: (props: any) => <svg data-testid="icon-alert-circle" {...props} />,
}));

jest.mock('@/hooks/chat/use-channel-files', () => ({
	useChannelFiles: jest.fn(),
}));

jest.mock('@/lib/chat/channel-files', () => ({
	getChannelFileViewUrl: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || String(e),
}));

import { useChannelFiles } from '@/hooks/chat/use-channel-files';
import { getChannelFileViewUrl } from '@/lib/chat/channel-files';

const channel: ChannelWithLastMessage = {
	id: 1,
	name: 'General',
	description: null,
	last_message_id: null,
};

function buildFile(overrides: Partial<ChannelFile> = {}): ChannelFile {
	return {
		id: 1,
		channel_id: 1,
		uploaded_by: 'user-1',
		file_name: 'photo.png',
		storage_path: '1/user-1/uuid-photo.png',
		mime_type: 'image/png',
		size_bytes: 1024,
		created_at: '2024-01-01T00:00:00Z',
		...overrides,
	};
}

function mockHook(overrides: Record<string, any> = {}) {
	const value = {
		files: [],
		loading: false,
		loadingMore: false,
		uploading: false,
		error: null,
		hasMore: false,
		ensureLoaded: jest.fn(),
		loadMore: jest.fn(),
		upload: jest.fn(),
		remove: jest.fn(),
		downloadFile: jest.fn(),
		reset: jest.fn(),
		...overrides,
	};
	(useChannelFiles as jest.Mock).mockReturnValue(value);
	return value;
}

describe('ChannelFilesDialog', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		channel,
		members: [],
		currentUserId: 'user-1',
		currentUserRole: 'Colocador',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockHook();
	});

	it('shows the preview button only for image and video files, not for pdf', () => {
		const files = [
			buildFile({ id: 1, mime_type: 'image/png' }),
			buildFile({ id: 2, mime_type: 'video/mp4' }),
			buildFile({ id: 3, mime_type: 'application/pdf' }),
		];
		mockHook({ files });

		render(<ChannelFilesDialog {...defaultProps} />);

		expect(screen.getAllByTestId('icon-eye').length).toBe(2);
		expect(screen.getAllByTestId('icon-download').length).toBe(3);
	});

	it('shows the delete button for the file uploader', () => {
		const files = [buildFile({ id: 1, uploaded_by: 'user-1' })];
		mockHook({ files });

		render(
			<ChannelFilesDialog {...defaultProps} currentUserId="user-1" currentUserRole="Colocador" />
		);

		expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
	});

	it('hides the delete button for a non-admin who did not upload the file', () => {
		const files = [buildFile({ id: 1, uploaded_by: 'user-2' })];
		mockHook({ files });

		render(
			<ChannelFilesDialog {...defaultProps} currentUserId="user-1" currentUserRole="Colocador" />
		);

		expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument();
	});

	it('shows the delete button for an admin even if they did not upload the file', () => {
		const files = [buildFile({ id: 1, uploaded_by: 'user-2' })];
		mockHook({ files });

		render(<ChannelFilesDialog {...defaultProps} currentUserId="user-1" currentUserRole="Admin" />);

		expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
	});

	it('shows a destructive alert with a retry button on initial load error, not the empty state', () => {
		mockHook({ files: [], error: 'Load failed' });

		render(<ChannelFilesDialog {...defaultProps} />);

		expect(screen.getByText('Load failed')).toBeInTheDocument();
		expect(screen.getByText('Reintentar')).toBeInTheDocument();
		expect(screen.queryByText('No hay archivos en este canal')).not.toBeInTheDocument();
	});

	it('ignores a stale preview response when a second preview is opened before the first resolves', async () => {
		let resolveFirst: (value: any) => void = () => {};
		(getChannelFileViewUrl as jest.Mock)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					})
			)
			.mockResolvedValueOnce({ url: 'https://signed.url/second.png', error: null });

		const files = [
			buildFile({ id: 1, file_name: 'first.png', mime_type: 'image/png' }),
			buildFile({ id: 2, file_name: 'second.png', mime_type: 'image/png' }),
		];
		mockHook({ files });

		render(<ChannelFilesDialog {...defaultProps} />);

		const [firstEye, secondEye] = screen.getAllByTestId('icon-eye');
		fireEvent.click(firstEye.closest('button')!);
		fireEvent.click(secondEye.closest('button')!);

		await waitFor(() => {
			expect(screen.getByAltText('second.png')).toBeInTheDocument();
		});

		await act(async () => {
			resolveFirst({ url: 'https://signed.url/first.png', error: null });
		});

		expect(screen.getByAltText('second.png')).toBeInTheDocument();
	});
});
