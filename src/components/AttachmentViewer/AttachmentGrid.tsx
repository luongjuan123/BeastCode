import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import AttachmentCard, { AttachmentFile } from "./AttachmentCard";
import AttachmentViewerModal from "./AttachmentViewerModal";

interface AttachmentGridProps {
	files: AttachmentFile[];
}

const AttachmentGrid: React.FC<AttachmentGridProps> = ({ files = [] }) => {
	const [user] = useAuthState(auth);
	const [idToken, setIdToken] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [activeIdx, setActiveIdx] = useState(0);

	useEffect(() => {
		if (user) {
			user.getIdToken().then((token) => {
				setIdToken(token);
			}).catch((err) => {
				console.error("Error fetching token for grid:", err);
			});
		}
	}, [user]);

	if (!files || files.length === 0) return null;

	const handleOpenPreview = (index: number) => {
		setActiveIdx(index);
		setIsOpen(true);
	};

	return (
		<div className="w-full space-y-3">
			{/* Grid container for individual cards */}
			<div className="flex flex-wrap gap-3.5">
				{files.map((file, idx) => (
					<AttachmentCard
						key={idx}
						file={file}
						idToken={idToken}
						onPreview={() => handleOpenPreview(idx)}
					/>
				))}
			</div>

			{/* Shared Previewer Modal */}
			<AttachmentViewerModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				attachments={files}
				initialIndex={activeIdx}
			/>
		</div>
	);
};

export default AttachmentGrid;
