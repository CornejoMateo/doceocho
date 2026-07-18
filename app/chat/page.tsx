import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ChatManagement } from '@/components/business/chat/chat-management';

export default function ChatPage() {
	return (
		<DashboardLayout>
			<ChatManagement />
		</DashboardLayout>
	);
}
