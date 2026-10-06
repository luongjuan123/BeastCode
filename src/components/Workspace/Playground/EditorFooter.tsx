import React, { useRef } from "react";
import { FaUpload } from "react-icons/fa";

type EditorFooterProps = {
	handleRun: () => void;
	handleSubmit: () => void;
	lightTheme?: boolean;
	onUploadFile: (code: string) => void;
	customInputChecked: boolean;
	setCustomInputChecked: (checked: boolean) => void;
	executingType: "run" | "submit" | null;
};

const EditorFooter: React.FC<EditorFooterProps> = ({
	handleRun,
	handleSubmit,
	onUploadFile,
	customInputChecked,
	setCustomInputChecked,
	executingType,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			if (event.target?.result) {
				onUploadFile(event.target.result as string);
			}
		};
		reader.readAsText(file);
	};

	return (
		<div className="flex w-full py-2.5 px-4 items-center justify-between border-t border-border-default bg-[#0b0d0c] select-none">
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				className="hidden"
				accept=".js,.py,.cpp,.c,.java,.txt"
			/>

			{/* Left Actions */}
			<div className="flex items-center space-x-5 text-xs">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors duration-150 cursor-pointer"
				>
					<FaUpload size={11} />
					<span>Upload File</span>
				</button>

				<label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-secondary transition-colors duration-150">
					<input
						type="checkbox"
						checked={customInputChecked}
						onChange={(e) => setCustomInputChecked(e.target.checked)}
						className="w-3.5 h-3.5 rounded border border-border-default bg-[var(--bg-surface)] text-accent focus:ring-0"
					/>
					<span>Custom Input</span>
				</label>
			</div>

			{/* Right Action Buttons */}
			<div className="flex items-center space-x-2">
				{/* Run button - neutral technical */}
				<button
					onClick={handleRun}
					disabled={executingType !== null}
					className="h-8 px-3.5 text-xs font-medium rounded-md transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--bg-elevated)] text-text-primary border border-border-default hover:border-border-strong hover:bg-[var(--bg-hover)]"
				>
					{executingType === "run" ? (
						<>
							<svg className="animate-spin h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
								<path d="M12 2a10 10 0 0110 10" strokeWidth="2" strokeLinecap="round" />
							</svg>
							<span>Running...</span>
						</>
					) : (
						<span>Run</span>
					)}
				</button>

				{/* Submit button - restrained green primary */}
				<button
					onClick={handleSubmit}
					disabled={executingType !== null}
					className="h-8 px-4 text-xs font-semibold rounded-md transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-accent hover:bg-accent-hover text-[#080909]"
				>
					{executingType === "submit" ? (
						<>
							<svg className="animate-spin h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
								<path d="M12 2a10 10 0 0110 10" strokeWidth="2" strokeLinecap="round" />
							</svg>
							<span>Submitting...</span>
						</>
					) : (
						<span>Submit</span>
					)}
				</button>
			</div>
		</div>
	);
};

export default EditorFooter;
