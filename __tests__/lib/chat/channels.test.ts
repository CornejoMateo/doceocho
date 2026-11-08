import { deleteChannelAction } from '@/lib/chat/channels';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { getCurrentUser } from '@/lib/auth';

jest.mock('@/lib/get-server-supabase-client', () => ({
	getServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
	getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/chat/channel-members', () => ({
	addChannelMember: jest.fn(),
}));

function createSupabaseMock(deleteResult: any) {
	const filesChain: Record<string, jest.Mock> = {
		select: jest.fn(() => filesChain),
		eq: jest.fn(() => filesChain),
		range: jest.fn(() => Promise.resolve({ data: [], error: null })),
	};

	const channelsChain: Record<string, jest.Mock> = {
		delete: jest.fn(() => channelsChain),
		eq: jest.fn(() => channelsChain),
		select: jest.fn(() => Promise.resolve(deleteResult)),
	};

	const storage: { from: jest.Mock; remove: jest.Mock } = {
		from: jest.fn(() => storage),
		remove: jest.fn().mockResolvedValue({ error: null }),
	};

	const supabase = {
		from: jest.fn((table: string) => (table === 'channel_files' ? filesChain : channelsChain)),
		storage: { from: jest.fn(() => storage) },
	};

	(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);
	return { channelsChain, storage };
}

describe('lib/chat/channels', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
	});

	describe('deleteChannelAction', () => {
		it('returns a permission error and skips blob removal when RLS denies the delete', async () => {
			const { channelsChain, storage } = createSupabaseMock({ data: [], error: null });

			const result = await deleteChannelAction(1);

			expect(channelsChain.delete).toHaveBeenCalled();
			expect(storage.remove).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				error: 'No tienes permisos para eliminar este canal',
			});
		});

		it('removes blobs and succeeds when a row is actually deleted', async () => {
			const { storage } = createSupabaseMock({ data: [{ id: 1 }], error: null });

			const result = await deleteChannelAction(1);

			expect(result).toEqual({ success: true });
		});
	});
});
