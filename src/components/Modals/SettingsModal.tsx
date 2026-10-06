import React from "react";
import { BsCheckLg, BsChevronDown } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { ISettings } from "../Workspace/Playground/Playground";
import useLocalStorage from "@/hooks/useLocalStorage";

const EDITOR_FONT_SIZES = ["12px", "13px", "14px", "15px", "16px", "17px", "18px"];

interface SettingsModalProps {
	settings: ISettings;
	setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ setSettings, settings }) => {
	const [fontSize, setFontSize] = useLocalStorage("lcc-fontSize", "16px");

	const handleClickDropdown = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.stopPropagation();
		setSettings({ ...settings, dropdownIsOpen: !settings.dropdownIsOpen });
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto font-sans" aria-modal="true" role="dialog">
			<div className="flex min-h-screen items-center justify-center p-4">
				{/* Backdrop */}
				<div
					className="fixed inset-0 bg-[#080909]/80 transition-opacity"
					onClick={() => setSettings({ ...settings, settingsModalIsOpen: false })}
				/>

				{/* Modal Container */}
				<div className="relative z-10 w-full max-w-md bg-[var(--bg-surface)] border border-border-default rounded-lg shadow-xl overflow-visible">
					{/* Header */}
					<div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default">
						<h3 className="text-sm font-semibold text-text-primary">
							Editor Settings
						</h3>
						<button
							className="text-text-muted hover:text-text-primary p-1 rounded-md transition-colors duration-150"
							onClick={() => setSettings({ ...settings, settingsModalIsOpen: false })}
						>
							<IoClose size={16} />
						</button>
					</div>

					{/* Body */}
					<div className="p-5 space-y-5">
						<div className="flex items-center justify-between gap-4">
							<div>
								<h4 className="text-xs font-semibold text-text-primary">Font Size</h4>
								<p className="text-[11px] text-text-muted mt-0.5">
									Adjust code editor font size
								</p>
							</div>
							<div className="w-32 relative">
								<button
									onClick={handleClickDropdown}
									className="flex items-center justify-between w-full h-8 px-3 rounded-md text-xs font-medium border border-border-default bg-[var(--bg-elevated)] text-text-primary hover:border-border-strong transition-colors duration-150"
									type="button"
								>
									<span>{fontSize}</span>
									<BsChevronDown size={10} className="text-text-muted" />
								</button>

								{settings.dropdownIsOpen && (
									<ul className="absolute right-0 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border-default bg-[var(--bg-elevated)] shadow-lg z-50 py-1 divide-y divide-transparent">
										{EDITOR_FONT_SIZES.map((sizeOption, idx) => {
											const isSelected = sizeOption === (settings.fontSize || fontSize);
											return (
												<li
													key={idx}
													onClick={() => {
														setFontSize(sizeOption);
														setSettings({ ...settings, fontSize: sizeOption, dropdownIsOpen: false });
													}}
													className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors duration-100 ${
														isSelected
															? "bg-accent/10 text-accent font-medium"
															: "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-hover)]"
													}`}
												>
													<span>{sizeOption}</span>
													{isSelected && <BsCheckLg size={10} className="text-accent" />}
												</li>
											);
										})}
									</ul>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsModal;
