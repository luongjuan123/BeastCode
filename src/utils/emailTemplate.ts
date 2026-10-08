import {
	EmailLayout,
	EmailHeader,
	EmailFooter,
	PrimaryButton,
	SecondaryButton,
	DestructiveButton,
	InfoRow,
	InfoTable,
	OtpBox,
	OrganizationCard,
	ContestCard,
	RecruitmentCard,
	HomeworkCard,
	NotificationCard,
	COLORS,
	escapeHtml,
	EMAIL_LOGO_CONFIG
} from "./emailComponents";

export { EMAIL_LOGO_CONFIG };

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
	secondaryCtaText?: string;
	secondaryCtaUrl?: string;
	isDestructiveCta?: boolean;
	footerText?: string; // Kept for compatibility
	recipientEmail?: string;
	preferenceType?: string;

	// Specialized brand card extensions
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

/**
 * Sanitizes rich text while preserving basic line breaks (<br/>)
 * and stripping/escaping any script, iframe, or unsafe tags.
 */
function sanitizeContent(content: string): string {
	if (!content) return "";
	// If content already contains <br/> or <br>, handle safely
	const normalized = content.replace(/<br\s*\/?>/gi, "___BR_TAG___");
	const escaped = escapeHtml(normalized);
	return escaped.replace(/___BR_TAG___/g, "<br/>");
}

export function getEmailHtml(options: EmailTemplateOptions): string {
	const {
		headerTitle,
		accentColor = COLORS.primary,
		title = "BeastCode Notification",
		leadText = "",
		description = "",
		details = [],
		ctaText,
		ctaUrl,
		secondaryCtaText,
		secondaryCtaUrl,
		isDestructiveCta = false,
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

	const safeTitle = escapeHtml(title);
	const safeLeadText = sanitizeContent(leadText);
	const safeDescription = sanitizeContent(description);

	// Render details using InfoRow with strict escaping
	const detailsRowsHtml = (details || [])
		.filter((item) => item && (item.label || item.value))
		.map((item) =>
			InfoRow({
				label: item.label || "",
				value: item.value || "",
				isHighlight: !!item.isHighlight,
				accentColor: accentColor || COLORS.primary
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

	// Determine CTA button rendering
	let ctaHtml = "";
	if (ctaText && ctaUrl) {
		if (isDestructiveCta) {
			ctaHtml = DestructiveButton({ text: ctaText, url: ctaUrl });
		} else {
			ctaHtml = PrimaryButton({ text: ctaText, url: ctaUrl, accentColor });
		}
	}
	if (secondaryCtaText && secondaryCtaUrl) {
		ctaHtml += SecondaryButton({ text: secondaryCtaText, url: secondaryCtaUrl });
	}

	// Build inside-card body layout
	const bodyContent = `
		${EmailHeader({ headerTitle, accentColor })}
		
		<!-- Content Body -->
		<tr>
			<td class="mobile-padding" style="padding: 32px 32px 28px 32px; background-color: ${COLORS.card}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
				<h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; line-height: 1.35; color: ${COLORS.primaryText}; letter-spacing: -0.3px;">
					${safeTitle}
				</h1>
				
				${safeLeadText ? `
				<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${COLORS.secondaryText}; font-weight: 400;">
					${safeLeadText}
				</p>
				` : ""}
				
				${safeDescription ? `
				<p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: ${COLORS.secondaryText}; opacity: 0.9;">
					${safeDescription}
				</p>
				` : ""}

				<!-- Specialized Cards -->
				${cardContentHtml}

				<!-- Details Table -->
				${details.length > 0 ? InfoTable({ content: detailsRowsHtml, accentColor }) : ""}

				<!-- Call to Action Buttons -->
				${ctaHtml}
			</td>
		</tr>

		${EmailFooter({ recipientEmail, preferenceType })}
	`;

	return EmailLayout({
		title: safeTitle,
		previewText: leadText ? leadText.replace(/<[^>]+>/g, "").substring(0, 150) : safeTitle,
		bodyContent
	});
}
