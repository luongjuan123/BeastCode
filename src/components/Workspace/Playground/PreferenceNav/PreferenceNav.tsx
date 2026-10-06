import { useState, useEffect } from "react";
import { AiOutlineFullscreen, AiOutlineFullscreenExit, AiOutlineSetting } from "react-icons/ai";
import { ISettings } from "../Playground";
import SettingsModal from "@/components/Modals/SettingsModal";
import BeastCodeSelect from "@/components/UI/BeastCodeSelect";

type SupportedLanguage = "javascript" | "python" | "cpp" | "java" | "c";

type PreferenceNavProps = {
	settings: ISettings;
	setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
	language: SupportedLanguage;
	setLanguage: (lang: SupportedLanguage) => void;
	lightTheme?: boolean;
	syncStatus: "connected" | "syncing" | "offline-saved" | "error";
};

const PreferenceNav: React.FC<PreferenceNavProps> = ({ setSettings, settings, language, setLanguage, syncStatus }) => {
	const [isFullScreen, setIsFullScreen] = useState(false);

	const handleFullScreen = () => {
		if (isFullScreen) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
		setIsFullScreen(!isFullScreen);
	};

	useEffect(() => {
		function exitHandler() {
			if (!document.fullscreenElement) {
				setIsFullScreen(false);
				return;
			}
			setIsFullScreen(true);
		}

		if (document.addEventListener) {
			document.addEventListener("fullscreenchange", exitHandler);
			document.addEventListener("webkitfullscreenchange", exitHandler);
			document.addEventListener("mozfullscreenchange", exitHandler);
			document.addEventListener("MSFullscreenChange", exitHandler);
		}
	}, [isFullScreen]);

	const syncBadgeStyles = {
		connected: "text-accent bg-accent/10 border-accent/20",
		syncing: "text-amber-400 bg-amber-500/10 border-amber-500/20",
		"offline-saved": "text-text-muted bg-[var(--bg-elevated)] border-border-default",
		error: "text-red-400 bg-red-500/10 border-red-500/20",
	}[syncStatus];

	return (
		<div className="flex items-center justify-between h-10 w-full px-3 border-b border-border-default bg-[#0b0d0c] select-none">
			<div className="flex items-center gap-3">
				<div className="w-40">
					<BeastCodeSelect
						size="sm"
						options={[
							{ value: "javascript", label: "JavaScript" },
							{ value: "python", label: "Python 3" },
							{ value: "cpp", label: "C++ (GCC 10)" },
							{ value: "java", label: "Java (OpenJDK 15)" },
							{ value: "c", label: "C (GCC 10)" }
						]}
						value={language}
						onChange={(val) => setLanguage(val as SupportedLanguage)}
					/>
				</div>

				{/* Sync Status Badge */}
				<div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${syncBadgeStyles}`}>
					<span
						className={`w-1.5 h-1.5 rounded-full ${
							syncStatus === "connected" ? "bg-accent" :
							syncStatus === "syncing" ? "bg-amber-400 animate-pulse" :
							syncStatus === "error" ? "bg-red-400" : "bg-text-muted"
						}`}
					/>
					<span>{syncStatus === "connected" ? "synced" : syncStatus}</span>
				</div>
			</div>

			<div className="flex items-center gap-1">
				<button
					className="w-7 h-7 flex items-center justify-center rounded-md border border-border-default bg-[var(--bg-surface)] text-text-muted hover:text-text-primary hover:border-border-strong transition-colors duration-150"
					onClick={() => setSettings({ ...settings, settingsModalIsOpen: true })}
					title="Editor Settings"
				>
					<AiOutlineSetting size={14} />
				</button>

				<button
					className="w-7 h-7 flex items-center justify-center rounded-md border border-border-default bg-[var(--bg-surface)] text-text-muted hover:text-text-primary hover:border-border-strong transition-colors duration-150"
					onClick={handleFullScreen}
					title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
				>
					{!isFullScreen ? <AiOutlineFullscreen size={14} /> : <AiOutlineFullscreenExit size={14} />}
				</button>
			</div>

			{settings.settingsModalIsOpen && <SettingsModal settings={settings} setSettings={setSettings} />}
		</div>
	);
};

export default PreferenceNav;
