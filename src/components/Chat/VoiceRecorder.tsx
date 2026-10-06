import React, { useState, useRef, useEffect } from "react";
import { FaMicrophone, FaStop, FaTrash, FaPaperPlane } from "react-icons/fa";

interface VoiceRecorderProps {
	onSendAudio: (base64Audio: string, durationSeconds: number) => void;
	onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendAudio, onCancel }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		startRecording();
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
				mediaRecorderRef.current.stop();
			}
		};
	}, []);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
					? "audio/webm;codecs=opus"
					: "audio/ogg",
			});

			mediaRecorderRef.current = mediaRecorder;
			chunksRef.current = [];

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
				setAudioBlob(blob);
				stream.getTracks().forEach((track) => track.stop());
			};

			mediaRecorder.start(200);
			setIsRecording(true);

			timerRef.current = setInterval(() => {
				setSeconds((s) => s + 1);
			}, 1000);
		} catch (err: any) {
			console.error("[VoiceRecorder getUserMedia error]:", err);
			onCancel();
		}
	};

	const handleStop = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		}
	};

	const handleSend = () => {
		if (!audioBlob) return;
		const reader = new FileReader();
		reader.readAsDataURL(audioBlob);
		reader.onloadend = () => {
			const base64Data = reader.result as string;
			onSendAudio(base64Data, seconds);
		};
	};

	const formatTime = (s: number) => {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
	};

	return (
		<div className="flex items-center gap-3 w-full px-4 py-2 bg-dark-fill-3 rounded-xl border border-brand-orange/40 animate-fade-in">
			{/* Pulsing indicator */}
			<div className="flex items-center gap-2 text-brand-orange">
				<span className="relative flex h-3 w-3">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
					<span className="relative inline-flex rounded-full h-3 w-3 bg-brand-orange"></span>
				</span>
				<span className="text-xs font-mono font-bold">{formatTime(seconds)}</span>
			</div>

			<span className="text-xs text-text-muted flex-1">
				{isRecording ? "Recording voice memo..." : "Recorded voice memo"}
			</span>

			{/* Actions */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="p-2 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition"
					title="Cancel recording"
				>
					<FaTrash size={13} />
				</button>

				{isRecording ? (
					<button
						type="button"
						onClick={handleStop}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold transition"
					>
						<FaStop size={11} />
						<span>Stop</span>
					</button>
				) : (
					<button
						type="button"
						onClick={handleSend}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange text-white hover:bg-brand-orange-hover text-xs font-bold transition shadow-md shadow-brand-orange/20"
					>
						<FaPaperPlane size={11} />
						<span>Send</span>
					</button>
				)}
			</div>
		</div>
	);
};
