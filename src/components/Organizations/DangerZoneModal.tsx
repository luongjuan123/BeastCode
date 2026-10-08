import React, { useState } from "react";
import {
	FaExclamationTriangle,
	FaTrash,
	FaTimes,
	FaSpinner,
	FaCheck,
	FaShieldAlt,
	FaArrowRight,
	FaLock,
} from "react-icons/fa";

interface DangerZoneModalProps {
	isOpen: boolean;
	onClose: () => void;
	org: {
		id: string;
		name: string;
		slug: string;
		memberCount?: number;
		problemCount?: number;
		contestCount?: number;
	};
	onConfirmDelete: (confirmationName: string) => Promise<void>;
}

export const DangerZoneModal: React.FC<DangerZoneModalProps> = ({
	isOpen,
	onClose,
	org,
	onConfirmDelete,
}) => {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [typedName, setTypedName] = useState("");
	const [confirmedRisk, setConfirmedRisk] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState("");

	if (!isOpen) return null;

	const handleClose = () => {
		if (isDeleting) return;
		setStep(1);
		setTypedName("");
		setConfirmedRisk(false);
		setError("");
		onClose();
	};

	const isNameMatch =
		typedName.trim().toLowerCase() === org.name.trim().toLowerCase() ||
		typedName.trim().toLowerCase() === org.slug.trim().toLowerCase();

	const handleExecute = async () => {
		if (!confirmedRisk || !isNameMatch) return;
		setIsDeleting(true);
		setError("");
		try {
			await onConfirmDelete(typedName.trim());
		} catch (err: any) {
			setError(err.message || "Failed to permanently delete organization");
			setIsDeleting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
			<div className="bg-[#0f1210] border border-red-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up text-white">
				{!isDeleting && (
					<button
						type="button"
						onClick={handleClose}
						className="absolute top-5 right-5 text-gray-500 hover:text-white transition"
					>
						<FaTimes size={14} />
					</button>
				)}

				{/* Header */}
				<div className="flex items-center gap-3 mb-4">
					<div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-500 shrink-0">
						<FaTrash size={16} />
					</div>
					<div>
						<h3 className="text-base font-black text-red-500">
							Permanently Delete Organization
						</h3>
						<p className="text-[10px] text-gray-400 font-mono">
							Step {step} of 3 • Irreversible Action
						</p>
					</div>
				</div>

				{/* Step Indicator */}
				<div className="flex items-center gap-1.5 mb-5">
					<div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-red-500" : "bg-gray-800"}`} />
					<div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-red-500" : "bg-gray-800"}`} />
					<div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-red-500" : "bg-gray-800"}`} />
				</div>

				{error && (
					<div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs">
						{error}
					</div>
				)}

				{/* STEP 1: Impact Scope Breakdown */}
				{step === 1 && (
					<div className="space-y-4 text-xs">
						<div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 leading-relaxed text-[11px]">
							<strong className="block text-red-400 font-bold mb-1">
								⚠️ What will happen:
							</strong>
							This will permanently purge <strong>{org.name}</strong>, including all custom problems, contests, roadmaps, teams, files, assignments, and chat channels.
						</div>

						<div className="space-y-2 p-3.5 rounded-xl bg-dark-layer-1 border border-gray-800 text-[11px] text-gray-300">
							<div className="font-bold text-white flex items-center gap-1.5 mb-1">
								<FaShieldAlt className="text-emerald-400" size={12} />
								<span>Member Preservation Guarantee</span>
							</div>
							<p className="text-gray-400 leading-relaxed">
								Individual members will <strong>NOT</strong> have their BeastCode accounts deleted. Their global solve records and other organization memberships remain completely intact. Only their affiliation with this organization will be removed.
							</p>
						</div>

						<div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
							<button
								type="button"
								onClick={handleClose}
								className="px-4 py-2 rounded-xl bg-dark-fill-3 hover:bg-dark-fill-2 text-gray-400 font-bold transition"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => setStep(2)}
								className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5"
							>
								<span>I Understand, Continue</span>
								<FaArrowRight size={11} />
							</button>
						</div>
					</div>
				)}

				{/* STEP 2: Name Typing Challenge */}
				{step === 2 && (
					<div className="space-y-4 text-xs">
						<p className="text-gray-300 text-[11px] leading-relaxed">
							To prevent accidental deletion, please type the exact organization name or slug to confirm:
						</p>

						<div className="p-3 rounded-xl bg-dark-layer-1 border border-gray-800 font-mono text-center text-red-400 font-bold text-sm tracking-wide select-text">
							{org.name}
						</div>

						<div>
							<label className="text-[10px] font-bold block mb-1 text-gray-400 uppercase tracking-wider">
								Type Name to Confirm:
							</label>
							<input
								type="text"
								value={typedName}
								onChange={(e) => setTypedName(e.target.value)}
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck={false}
								className="w-full bg-dark-layer-2 border border-gray-800 focus:border-red-500 rounded-xl p-3 text-white text-xs outline-none font-mono"
							/>
						</div>

						<div className="flex justify-between items-center pt-3 border-t border-gray-850">
							<button
								type="button"
								onClick={() => setStep(1)}
								className="text-gray-400 hover:text-white transition font-bold text-xs"
							>
								Back
							</button>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={handleClose}
									className="px-4 py-2 rounded-xl bg-dark-fill-3 hover:bg-dark-fill-2 text-gray-400 font-bold transition"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => setStep(3)}
									disabled={!isNameMatch}
									className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center gap-1.5"
								>
									<span>Next Step</span>
									<FaArrowRight size={11} />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* STEP 3: Final Security Confirmation */}
				{step === 3 && (
					<div className="space-y-4 text-xs">
						<div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-[11px] space-y-2">
							<p className="font-bold flex items-center gap-1.5 text-red-400">
								<FaLock size={12} /> Final Confirmation
							</p>
							<p className="leading-relaxed">
								You are about to irreversibly destroy <strong>{org.name}</strong> and all associated data. This action is immediate and non-recoverable.
							</p>
						</div>

						<label className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-layer-1 border border-gray-800 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={confirmedRisk}
								onChange={(e) => setConfirmedRisk(e.target.checked)}
								className="rounded text-red-600 focus:ring-0 mt-0.5 cursor-pointer"
							/>
							<span className="text-[11px] text-gray-300 leading-snug">
								I confirm that I want to permanently delete this organization, and I understand this cannot be undone.
							</span>
						</label>

						<div className="flex justify-between items-center pt-3 border-t border-gray-850">
							<button
								type="button"
								onClick={() => setStep(2)}
								disabled={isDeleting}
								className="text-gray-400 hover:text-white transition font-bold text-xs"
							>
								Back
							</button>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={handleClose}
									disabled={isDeleting}
									className="px-4 py-2 rounded-xl bg-dark-fill-3 hover:bg-dark-fill-2 text-gray-400 font-bold transition"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleExecute}
									disabled={!confirmedRisk || isDeleting}
									className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center gap-2"
								>
									{isDeleting ? (
										<>
											<FaSpinner className="animate-spin" size={13} />
											<span>Purging All Data...</span>
										</>
									) : (
										<>
											<FaTrash size={12} />
											<span>Permanently Delete</span>
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
