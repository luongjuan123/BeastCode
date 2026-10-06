import {
	EmailLayout,
	EmailHeader,
	EmailFooter,
	PrimaryButton,
	InfoRow,
	InfoTable,
	OtpBox,
	OrganizationCard,
	ContestCard,
	RecruitmentCard,
	HomeworkCard,
	NotificationCard,
	COLORS
} from "./emailComponents";

export interface EmailDetailsItem {
	label: string;
	value: string;
	isHighlight?: boolean;
}

export interface EmailTemplateOptions {
	headerTitle?: string;
	accentColor?: string;
	accentGlowColor?: string; // Kept for compatibility
	title: string;
	leadText: string;
	description?: string;
	details?: EmailDetailsItem[];
	ctaText?: string;
	ctaUrl?: string;
	footerText?: string; // Kept for compatibility
	recipientEmail?: string;
	preferenceType?: string;

	// Brand card extensions
	otpCode?: string;
	otpExpiration?: string;
	orgCard?: {
		orgName: string;
		orgAvatar?: string;
		roleName?: string;
		ownerName?: string;
		detailsText?: string;
	};
	contestCard?: {
		title: string;
		startTime: string;
		duration: string;
		countdown?: string;
		bannerUrl?: string;
	};
	recruitmentCard?: {
		companyName: string;
		companyLogo?: string;
		jobTitle: string;
		skills?: string[];
		description?: string;
	};
	homeworkCard?: {
		title: string;
		dueDate: string;
		difficulty: string;
		teacher: string;
		orgName: string;
	};
	notificationCard?: {
		title: string;
		description: string;
		timestamp: string;
	};
}

export function getEmailHtml(options: EmailTemplateOptions): string {
	const {
		headerTitle,
		accentColor = COLORS.primary,
		title,
		leadText,
		description = "",
		details = [],
		ctaText,
		ctaUrl,
		recipientEmail,
		preferenceType,

		otpCode,
		otpExpiration,
		orgCard,
		contestCard,
		recruitmentCard,
		homeworkCard,
		notificationCard
	} = options;

	// Render details using InfoRow
	const detailsRowsHtml = details
		.map((item) =>
			InfoRow({
				label: item.label,
				value: item.value,
				isHighlight: item.isHighlight,
				accentColor: accentColor
			})
		)
		.join("");

	// Build specialized cards HTML
	let cardContentHtml = "";
	if (otpCode) {
		cardContentHtml += OtpBox({ code: otpCode, expirationText: otpExpiration });
	}
	if (orgCard) {
		cardContentHtml += OrganizationCard(orgCard);
	}
	if (contestCard) {
		cardContentHtml += ContestCard(contestCard);
	}
	if (recruitmentCard) {
		cardContentHtml += RecruitmentCard(recruitmentCard);
	}
	if (homeworkCard) {
		cardContentHtml += HomeworkCard(homeworkCard);
	}
	if (notificationCard) {
		cardContentHtml += NotificationCard(notificationCard);
	}

	// Build the complete inside-card body layout
	const bodyContent = `
		${EmailHeader({ headerTitle, accentColor })}
		
		<!-- Content Body -->
		<tr>
			<td style="padding: 40px 35px 35px 35px; background-color: ${COLORS.card}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
				<h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 800; line-height: 1.3; color: ${COLORS.primaryText}; letter-spacing: -0.5px;">
					${title}
				</h1>
				
				<p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: ${COLORS.secondaryText}; font-weight: 500;">
					${leadText}
				</p>
				
				${description ? `
				<p style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.6; color: ${COLORS.secondaryText}; opacity: 0.9;">
					${description}
				</p>
				` : ""}

				<!-- Specialized Card -->
				${cardContentHtml}

				<!-- Details Card -->
				${details.length > 0 ? InfoTable({ content: detailsRowsHtml, accentColor }) : ""}

				<!-- CTA Block -->
				${ctaText && ctaUrl ? PrimaryButton({ text: ctaText, url: ctaUrl, accentColor }) : ""}
			</td>
		</tr>

		${EmailFooter({ recipientEmail, preferenceType })}
	`;

	return EmailLayout({
		title,
		previewText: leadText,
		bodyContent
	});
}
