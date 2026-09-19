'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getSupabaseClient } from '@/lib/supabase-client';
import { listModuleFiles } from '@/lib/modules/modules-files';
import {
	isImage,
	getFileKind,
	isValidFileSize,
	MAX_MODULE_IMAGE_SIZE,
	MAX_MODULE_VIDEO_SIZE,
} from '@/utils/file-upload-utils';
import { PendingFile } from '@/components/business/modules/inputs-form-module';

const RECORDING_STOP_MARGIN = 1024 * 1024; // When the video reaches this point, it cuts off

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
	const [recordingSize, setRecordingSize] = useState(0);

	const [error, setError] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const videoPreviewRef = useRef<HTMLVideoElement>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const recordingTimerRef = useRef<number | null>(null);
	const autoStoppedByLimitRef = useRef(false);
	const originalExistingIdsRef = useRef<number[]>([]);
	const filesRef = useRef<PendingFile[]>([]);

	useEffect(() => {
		if (!enabled) {
			clearFiles();
			return;
		}

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
							size: blob?.size,
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
				setFiles((prev) => {
					releasePreviews(prev);
					return pendingFiles;
				});
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
		filesRef.current = files;
	}, [files]);

	useEffect(() => {
		return () => {
			stopRecording();
			releasePreviews(filesRef.current);
		};
	}, []);

	useEffect(() => {
		if (!isRecording || !mediaStreamRef.current || !videoPreviewRef.current) return;
		const video = videoPreviewRef.current;
		video.srcObject = mediaStreamRef.current;
		video.onloadedmetadata = () => {
			video.play().catch(() => {});
		};
	}, [isRecording, videoPreviewRef]);

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

	const addFiles = useCallback((incoming: File[], opts?: { allowOversize?: boolean }) => {
		const isAllowedType = (file: File) => isImage(file.type) || file.type.startsWith('video/');
		const isAllowedSize = (file: File) =>
			opts?.allowOversize ||
			isValidFileSize(file, isImage(file.type) ? MAX_MODULE_IMAGE_SIZE : MAX_MODULE_VIDEO_SIZE);

		const newFiles: PendingFile[] = incoming
			.filter((file) => isAllowedType(file) && isAllowedSize(file))
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

		let rejectedImages = 0;
		let rejectedVideos = 0;
		incoming.forEach((file) => {
			if (!isAllowedType(file) || opts?.allowOversize) return;
			if (
				!isValidFileSize(file, isImage(file.type) ? MAX_MODULE_IMAGE_SIZE : MAX_MODULE_VIDEO_SIZE)
			) {
				if (isImage(file.type)) rejectedImages += 1;
				else rejectedVideos += 1;
			}
		});

		if (rejectedImages > 0 || rejectedVideos > 0) {
			const parts = [
				rejectedImages > 0 ? `${rejectedImages} imagen(es) superan el límite de 10MB` : null,
				rejectedVideos > 0 ? `${rejectedVideos} video(s) superan el límite de 50MB` : null,
			].filter(Boolean);
			toast({
				variant: 'destructive',
				title: 'Archivo(s) no agregados',
				description: `${parts.join('. ')}.`,
			});
		}

		setFiles((prev) => [...prev, ...newFiles]);
	}, []);

	const stopRecordingInternal = () => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current = null;
		}
		if (recordingTimerRef.current) {
			window.clearInterval(recordingTimerRef.current);
			recordingTimerRef.current = null;
		}
		setIsRecording(false);
		setRecordingTime(0);
		setRecordingSize(0);
	};

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1280, max: 1280 },
					height: { ideal: 720, max: 720 },
				},
				audio: true,
			});

			if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
				stream.getTracks().forEach((track) => track.stop());
				toast({
					variant: 'destructive',
					title: 'No se puede grabar',
					description: 'Tu dispositivo no soporta grabación de video.',
				});
				return;
			}

			mediaStreamRef.current = stream;

			const mimeType = MediaRecorder.isTypeSupported('video/mp4')
				? 'video/mp4'
				: MediaRecorder.isTypeSupported('video/webm')
					? 'video/webm'
					: '';

			const recorder = new MediaRecorder(stream, {
				...(mimeType ? { mimeType } : {}),
				videoBitsPerSecond: 3_000_000,
				audioBitsPerSecond: 128_000,
			});
			chunksRef.current = [];
			autoStoppedByLimitRef.current = false;
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
					const total = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
					setRecordingSize(total);
					if (
						!autoStoppedByLimitRef.current &&
						recorder.state === 'recording' &&
						total >= MAX_MODULE_VIDEO_SIZE - RECORDING_STOP_MARGIN
					) {
						autoStoppedByLimitRef.current = true;
						recorder.stop();
					}
				}
			};
			recorder.onstop = () => {
				if (autoStoppedByLimitRef.current) {
					toast({
						variant: 'default',
						title: 'Límite de grabación alcanzado',
						description: 'La grabación se detuvo al superar los 50MB.',
					});
				}
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || 'video/webm',
				});
				if (blob.size > 0) {
					const extension = (recorder.mimeType || 'video/mp4').split('/')[1] || 'mp4';
					const file = new File([blob], `video_${Date.now()}.${extension}`, {
						type: recorder.mimeType || 'video/mp4',
					});
					addFiles([file], { allowOversize: true });
				}
				stopRecordingInternal();
			};
			mediaRecorderRef.current = recorder;
			recorder.start(1000);
			setIsRecording(true);
			setRecordingTime(0);
			setRecordingSize(0);
			recordingTimerRef.current = window.setInterval(() => {
				setRecordingTime((t) => t + 1);
			}, 1000);
		} catch (error) {
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}
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
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
		recordingSize,
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
