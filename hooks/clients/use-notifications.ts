import { authFetch } from '@/lib/auth/auth-fetch';
import { useState } from 'react';
import { getClientById } from '@/lib/clients/clients';
import { WorkWithProgress } from '@/lib/works/works';

type ModalType = 'email' | 'whatsapp' | null;

export function useNotifications() {
	const [activeModal, setActiveModal] = useState<ModalType>(null);
	const [selectedWork, setSelectedWork] = useState<WorkWithProgress | null>(null);
	const [selectedClient, setSelectedClient] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const prepareNotification = async (work: WorkWithProgress, type: ModalType) => {
		if (!work.client_id) {
			console.error('La obra no tiene cliente asignado');
			return;
		}

		try {
			setLoading(true);

			const { data: client, error } = await getClientById(work.client_id);

			if (error || !client) {
				throw error;
			}

			setSelectedWork(work);
			setSelectedClient(client);
			setActiveModal(type);
		} catch (error) {
			console.error('Error preparando notificación:', error);
		} finally {
			setLoading(false);
		}
	};

	const openEmail = (work: WorkWithProgress) => prepareNotification(work, 'email');

	const openWhatsApp = (work: WorkWithProgress) => prepareNotification(work, 'whatsapp');

	const closeModal = () => {
		setActiveModal(null);
		setSelectedWork(null);
		setSelectedClient(null);
	};

	const sendWhatsApp = async (data: any) => {
		try {
			setLoading(true);

			const response = await authFetch('/api/send-whatsapp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error);
			}

			if (result.data?.whatsappUrl) {
				window.open(result.data.whatsappUrl, '_blank');
			}

			closeModal();
		} catch (error) {
			console.error('Error enviando WhatsApp:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const sendEmail = async (data: any) => {
		try {
			setLoading(true);

			const response = await authFetch('/api/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error);
			}

			closeModal();
		} catch (error) {
			console.error('Error enviando email:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	return {
		activeModal,
		selectedWork,
		selectedClient,
		loading,
		openEmail,
		openWhatsApp,
		sendEmail,
		sendWhatsApp,
		closeModal,
	};
}
