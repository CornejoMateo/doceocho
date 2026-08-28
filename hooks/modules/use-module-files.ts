'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getSupabaseClient } from '@/lib/supabase-client';
import { listModuleFiles } from '@/lib/modules/modules-files';
import { isImage, getFileKind } from '@/utils/file-upload-utils';
import { PendingFile } from '@/components/business/modules/inputs-form-module';

interface UseModuleFilesOptions {
	moduleToEdit?: { id: number } | null;
	enabled?: boolean;
}

export function useModuleFiles({ moduleToEdit, enabled = true }: UseModuleFilesOptions) {
	const [files, setFiles] = useState<PendingFile[]>([]);
	const [editorOpen, setEditorOpen] = useState(false);
	const [fileForEditor, setFileForEditor] = useState<File | null>(null);
	const [editingFileId, setEditingFileId] = useState<string | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);

	const [error, setError] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const videoPreviewRef = useRef<HTMLVideoElement>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const recordingTimerRef = useRef<number | null>(null);
	const originalExistingIdsRef = useRef<number[]>([]);

	useEffect(() => {
		if (!enabled) return;

		let cancelled = false;
		setError(null);

		const loadExistingFiles = async () => {
			if (!moduleToEdit) {
				clearFiles();
				return;
			}

			const { data: existingFiles, error } = await listModuleFiles(moduleToEdit.id);
			if (cancelled) return;
			if (error) {
				setError('Error cargando archivos existentes: ' + translateError(error));
				return;
			}

			const pendingFiles: PendingFile[] = await Promise.all(
				(existingFiles ?? []).map(async (f) => {
					try {
						const { data: blob } = await getSupabaseClient()
							.storage.from('modules')
							.download(f.storage_path);
						const isImg =
							isImage(blob?.type || '') || getFileKind(f.file_name || f.storage_path) === 'image';
						return {
							id: `existing-${f.id}`,
							preview: blob ? URL.createObjectURL(blob) : '',
							isImage: isImg,
							displayName: f.file_name || 'Archivo',
							description: f.description || '',
							existingId: f.id,
						} as PendingFile;
					} catch (err) {
						console.error('Error descargando archivo existente:', f.storage_path, err);
						return {
							id: `existing-${f.id}`,
							preview: '',
							isImage: false,
							displayName: f.file_name || 'Archivo',
							description: f.description || '',
							existingId: f.id,
						} as PendingFile;
					}
				})
			);

			if (!cancelled) {
				originalExistingIdsRef.current = (existingFiles ?? []).map((f) => f.id);
				setFiles(pendingFiles);
			}
		};

		loadExistingFiles();

		return () => {
			cancelled = true;
		};
	}, [enabled, moduleToEdit]);

	const releasePreviews = useCallback((pendingList: PendingFile[]) => {
		pendingList.forEach((pending) => {
			if (pending.preview) {
				URL.revokeObjectURL(pending.preview);
			}
		});
	}, []);

	useEffect(() => {
		return () => {
			stopRecording();
			releasePreviews(files);
		};
	}, []);

	const clearFiles = () => {
		setFiles((prev) => {
			releasePreviews(prev);
			return [];
		});
		setEditingFileId(null);
	};

	const cleanupPreviewUrl = (pending: PendingFile) => {
		if (pending.preview) {
			URL.revokeObjectURL(pending.preview);
		}
	};

	const addFiles = useCallback((incoming: File[]) => {
		const newFiles: PendingFile[] = incoming
			.filter((file) => isImage(file.type) || file.type.startsWith('video/'))
			.map((file) => {
				const isImg = isImage(file.type);
				return {
					id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					file,
					preview: isImg ? URL.createObjectURL(file) : '',
					isImage: isImg,
					displayName: file.name.replace(/\.[^/.]+$/, ''),
					description: '',
				};
			});
		setFiles((prev) => [...prev, ...newFiles]);
	}, []);

	const stopRecordingInternal = () => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
		if (recordingTimerRef.current) {
			window.clearInterval(recordingTimerRef.current);
			recordingTimerRef.current = null;
		}
		setRecordingTime(0);
	};

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
				audio: true,
			});

			if (!MediaRecorder || !window.MediaRecorder) {
				stream.getTracks().forEach((track) => track.stop());
				toast({
					variant: 'destructive',
					title: 'No se puede grabar',
					description: 'Tu dispositivo no soporta grabación de video.',
				});
				return;
			}

			mediaStreamRef.current = stream;
			if (videoPreviewRef.current) {
				videoPreviewRef.current.srcObject = stream;
				videoPreviewRef.current.onloadedmetadata = () => {
					videoPreviewRef.current?.play().catch(() => {});
				};
			}

			const mimeType = MediaRecorder.isTypeSupported('video/mp4')
				? 'video/mp4'
				: MediaRecorder.isTypeSupported('video/webm')
					? 'video/webm'
					: '';

			const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
			chunksRef.current = [];
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
				}
			};
			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || 'video/webm',
				});
				if (blob.size > 0) {
					const extension = (recorder.mimeType || 'video/mp4').split('/')[1] || 'mp4';
					const file = new File([blob], `video_${Date.now()}.${extension}`, {
						type: recorder.mimeType || 'video/mp4',
					});
					addFiles([file]);
				}
				stopRecordingInternal();
			};
			mediaRecorderRef.current = recorder;
			recorder.start();
			setIsRecording(true);
			setRecordingTime(0);
			recordingTimerRef.current = window.setInterval(() => {
				setRecordingTime((t) => t + 1);
			}, 1000);
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'No se pudo grabar video',
				description:
					translateError(error) ||
					'Ocurrió un error al intentar acceder a la cámara y el micrófono.',
			});
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
		}
	};

	const toggleRecording = () => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};

	const handleImageReady = (imageFile: File): boolean => {
		try {
			if (editingFileId) {
				setFiles((prev) =>
					prev.map((f) => {
						if (f.id === editingFileId) {
							cleanupPreviewUrl(f);
							return {
								...f,
								editedFile: imageFile,
								preview: URL.createObjectURL(imageFile),
								file: imageFile,
								isImage: true,
							};
						}
						return f;
					})
				);
				setEditingFileId(null);
				setFileForEditor(null);
			} else {
				addFiles([imageFile]);
				setFileForEditor(null);
			}
			return true;
		} catch {
			setEditingFileId(null);
			setFileForEditor(null);
			return false;
		}
	};

	const removeFile = (id: string) => {
		setFiles((prev) => {
			const target = prev.find((f) => f.id === id);
			if (target) {
				cleanupPreviewUrl(target);
			}
			return prev.filter((f) => f.id !== id);
		});
	};

	const updateFileField = (id: string, field: 'displayName' | 'description', value: string) => {
		setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
	};

	const removeAllFiles = () => {
		clearFiles();
	};

	const openEditorForNew = () => {
		setEditingFileId(null);
		setFileForEditor(null);
		setEditorOpen(true);
	};

	const openEditorForEdit = (id: string, file: File) => {
		setEditingFileId(id);
		setFileForEditor(file);
		setEditorOpen(true);
	};

	const closeEditor = () => {
		setEditorOpen(false);
		setFileForEditor(null);
	};

	const getOriginalExistingIds = () => originalExistingIdsRef.current;

	return {
		files,
		setFiles,
		addFiles,
		removeFile,
		updateFileField,
		removeAllFiles,
		isRecording,
		recordingTime,
		startRecording,
		stopRecording,
		toggleRecording,
		videoPreviewRef,
		fileInputRef,
		editorOpen,
		fileForEditor,
		openEditorForNew,
		openEditorForEdit,
		closeEditor,
		handleImageReady,
		getOriginalExistingIds,
		errorFiles: error,
	};
}
