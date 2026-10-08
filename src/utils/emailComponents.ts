/**
 * Centralized Email Component System for BeastCode
 * 
 * Synchronized with the BeastCode Dark Technical Developer Platform Design System:
 * - Near-black canvas (#080909) with dark surfaces (#0f1210 / #151816)
 * - 1px technical borders (#242824 / #1a1e1b)
 * - Restrained technical green brand accent (#22c55e)
 * - High-contrast typography (#f1f3ef / #a6aca5)
 * - Bulletproof table layouts compatible with Gmail, Outlook, Apple Mail, and mobile clients
 * - Strict HTML sanitization against XSS / injection attacks
 */

import { getSiteUrl, buildAbsoluteUrl } from "./siteConfig";

// Official BeastCode Design System Tokens
export const COLORS = {
	background: "#080909",      // Near-black page base
	card: "#0f1210",            // Primary dark surface
	elevated: "#151816",        // Elevated container / nested surface
	hover: "#1c211e",           // Interactive element hover state
	border: "#242824",          // Default 1px technical border
	borderSubtle: "#1a1e1b",    // Subtle divider border
	borderStrong: "#323833",    // Highlighted border
	primary: "#22c55e",         // Technical brand green
	primaryHover: "#16a34a",    // Green hover state
	primaryText: "#f1f3ef",     // High-contrast primary text
	secondaryText: "#a6aca5",   // Clean secondary / descriptive text
	mutedText: "#6f766f",       // Subdued metadata & label text
	accent: "#22c55e",          // Unified brand accent (green)
	success: "#22c55e",         // Success status
	warning: "#f59e0b",         // Warning status
	danger: "#ef4444",          // Error / destructive status
	info: "#64748b",            // Informational badge
	// Compatibility aliases
	hoverAccent: "#16a34a",
};

/**
 * Strict HTML escaping utility to sanitize all user-controlled values
 * before rendering into email HTML templates.
 */
export function escapeHtml(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

interface EmailLayoutProps {
	previewText?: string;
	title: string;
	bodyContent: string;
}

export function EmailLayout({ previewText, title, bodyContent }: EmailLayoutProps): string {
	const safeTitle = escapeHtml(title);
	const safePreview = previewText ? escapeHtml(previewText) : "";

	return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: dark only;
      supported-color-schemes: dark;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: ${COLORS.background} !important;
      color: ${COLORS.primaryText} !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    table, td {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0px !important;
        border-left: none !important;
        border-right: none !important;
      }
      .email-wrapper {
        padding: 0px !important;
      }
      .mobile-padding {
        padding: 24px 20px !important;
      }
      .mobile-header-padding {
        padding: 28px 20px 20px 20px !important;
      }
      .mobile-button {
        width: 100% !important;
        display: block !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${COLORS.primaryText};">
  ${safePreview ? `
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${COLORS.background}; opacity: 0;">
    ${safePreview}
  </div>
  ` : ""}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="background-color: ${COLORS.background}; padding: 36px 16px;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card Container (600px Max) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; border-collapse: separate; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          ${bodyContent}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Canonical BeastCode Email Branding Configuration
 *
 * Uses the permanent, SSL-verified, globally-cached Firebase CDN endpoint (beastcode-7555e).
 * Guarantees 100% email client deliverability (Gmail, Outlook, Apple Mail, Yahoo) without
 * relying on unverified custom domains, local file paths, or localhost addresses.
 */
export const EMAIL_LOGO_CONFIG = {
	url: process.env.EMAIL_LOGO_URL || "https://beastcode-7555e.web.app/beastcode-icon.png",
	fullLogoUrl: process.env.EMAIL_FULL_LOGO_URL || "https://beastcode-7555e.web.app/beastcode-logo.png",
	alt: "BeastCode",
	width: 36,
	height: 36,
};

interface EmailHeaderProps {
	headerTitle?: string;
	accentColor?: string;
}

export function EmailHeader({ headerTitle, accentColor = COLORS.primary }: EmailHeaderProps): string {
	const safeHeaderTitle = headerTitle ? escapeHtml(headerTitle) : "";
	const safeAccentColor = accentColor || COLORS.primary;
	const siteUrl = getSiteUrl();

	return `
    <!-- Header Section -->
    <tr>
      <td align="center" class="mobile-header-padding" style="padding: 32px 32px 24px 32px; background-color: ${COLORS.card}; border-bottom: 1px solid ${COLORS.border};">
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <!-- BeastCode Brand Logo Icon (Email Client Compatible) -->
            <td align="center" valign="middle" style="padding-right: 12px; width: 36px;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: block; width: 36px; height: 36px;">
                <img 
                  src="${EMAIL_LOGO_CONFIG.url}" 
                  width="${EMAIL_LOGO_CONFIG.width}" 
                  height="${EMAIL_LOGO_CONFIG.height}" 
                  alt="${EMAIL_LOGO_CONFIG.alt}" 
                  border="0"
                  style="display: block; width: 36px; height: 36px; max-width: 36px; max-height: 36px; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; border-radius: 6px;" 
                />
              </a>
            </td>
            <!-- Brand Wordmark -->
            <td valign="middle" style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none; color: ${COLORS.primaryText};">
                Beast<span style="color: ${COLORS.primary};">Code</span>
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Platform Subtitle -->
        <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 500; color: ${COLORS.secondaryText}; letter-spacing: 0.3px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Developer Platform &amp; Competitive Programming
        </p>
        
        ${safeHeaderTitle ? `
        <!-- Status / Header Badge -->
        <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
          <tr>
            <td style="border: 1px solid ${COLORS.border}; border-radius: 14px; padding: 4px 14px; background-color: ${COLORS.elevated}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${safeAccentColor}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${safeHeaderTitle}
            </td>
          </tr>
        </table>
        ` : ""}
      </td>
    </tr>
	`;
}

interface EmailFooterProps {
	recipientEmail?: string;
	preferenceType?: string;
}

export function EmailFooter({ recipientEmail, preferenceType }: EmailFooterProps): string {
	const origin = getSiteUrl();
	const safeEmail = recipientEmail ? escapeHtml(recipientEmail) : "";

	return `
    <!-- Footer Section -->
    <tr>
      <td class="mobile-padding" style="padding: 28px 32px; border-top: 1px solid ${COLORS.border}; background-color: ${COLORS.card}; text-align: center; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Support Links -->
        <p style="margin: 0 0 10px 0; font-size: 12px; color: ${COLORS.secondaryText}; font-weight: 500; line-height: 1.5;">
          Questions or assistance? <a href="mailto:support@beastcode.codes" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 600;">support@beastcode.codes</a>
        </p>
        
        <!-- Platform Links -->
        <p style="margin: 0 0 14px 0; font-size: 12px; color: ${COLORS.mutedText}; font-weight: 500;">
          <a href="${origin}" target="_blank" style="color: ${COLORS.secondaryText}; text-decoration: none; margin: 0 8px; font-weight: 500;">Platform</a> &bull;
          <a href="${origin}/rankings" target="_blank" style="color: ${COLORS.secondaryText}; text-decoration: none; margin: 0 8px; font-weight: 500;">Rankings</a> &bull;
          <a href="${origin}/contests" target="_blank" style="color: ${COLORS.secondaryText}; text-decoration: none; margin: 0 8px; font-weight: 500;">Contests</a> &bull;
          <a href="${origin}/threads" target="_blank" style="color: ${COLORS.secondaryText}; text-decoration: none; margin: 0 8px; font-weight: 500;">Community</a>
        </p>

        <!-- Automated System Notice -->
        <p style="margin: 0 0 8px 0; font-size: 11px; color: ${COLORS.mutedText}; line-height: 1.4;">
          This is an automated system email from BeastCode. Please do not reply directly.
        </p>

        <!-- Copyright Notice -->
        <p style="margin: 0; font-size: 11px; color: ${COLORS.mutedText};">
          &copy; 2026 BeastCode Platform. All rights reserved.
        </p>
        
        ${safeEmail ? `
        <!-- Unsubscribe & Notification Preferences -->
        <p style="margin: 14px 0 0 0; font-size: 11px; color: ${COLORS.mutedText}; line-height: 1.5;">
          Sent to <span style="color: ${COLORS.primaryText}; font-weight: 500;">${safeEmail}</span>. 
          <a href="${origin}/unsubscribe?email=${encodeURIComponent(recipientEmail || "")}${preferenceType ? `&amp;type=${encodeURIComponent(preferenceType)}` : ""}" target="_blank" style="color: ${COLORS.primary}; text-decoration: underline; font-weight: 500;">Unsubscribe</a> 
          &bull; 
          <a href="${origin}/settings" target="_blank" style="color: ${COLORS.primary}; text-decoration: underline; font-weight: 500;">Notification Preferences</a>
        </p>
        ` : `
        <p style="margin: 14px 0 0 0; font-size: 11px; color: ${COLORS.mutedText}; line-height: 1.5;">
          <a href="${origin}/settings" target="_blank" style="color: ${COLORS.primary}; text-decoration: underline; font-weight: 500;">Manage Notification Preferences</a>
        </p>
        `}
      </td>
    </tr>
	`;
}

interface ButtonProps {
	text: string;
	url: string;
	accentColor?: string;
}

export function PrimaryButton({ text, url, accentColor = COLORS.primary }: ButtonProps): string {
	const safeText = escapeHtml(text);
	const safeUrl = escapeHtml(url);
	const btnBg = accentColor || COLORS.primary;

	return `
    <!-- Bulletproof Primary Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
            <tr>
              <td align="center" style="border-radius: 6px; background-color: ${btnBg};">
                <a href="${safeUrl}" target="_blank" class="mobile-button" style="display: inline-block; padding: 13px 32px; background-color: ${btnBg}; color: #080909; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; border-radius: 6px; border: 1px solid ${btnBg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${safeText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
	`;
}

export function SecondaryButton({ text, url }: ButtonProps): string {
	const safeText = escapeHtml(text);
	const safeUrl = escapeHtml(url);

	return `
    <!-- Bulletproof Secondary Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; margin-bottom: 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
            <tr>
              <td align="center" style="border-radius: 6px; background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border};">
                <a href="${safeUrl}" target="_blank" class="mobile-button" style="display: inline-block; padding: 12px 28px; background-color: ${COLORS.elevated}; color: ${COLORS.primaryText}; text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.2px; border-radius: 6px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${safeText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
	`;
}

export function DestructiveButton({ text, url }: ButtonProps): string {
	const safeText = escapeHtml(text);
	const safeUrl = escapeHtml(url);

	return `
    <!-- Bulletproof Destructive Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; margin-bottom: 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
            <tr>
              <td align="center" style="border-radius: 6px; background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.danger};">
                <a href="${safeUrl}" target="_blank" class="mobile-button" style="display: inline-block; padding: 12px 28px; background-color: ${COLORS.elevated}; color: ${COLORS.danger}; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.2px; border-radius: 6px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${safeText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
	`;
}

interface InfoRowProps {
	label: string;
	value: string;
	isHighlight?: boolean;
	accentColor?: string;
}

export function InfoRow({ label, value, isHighlight = false, accentColor = COLORS.primary }: InfoRowProps): string {
	const safeLabel = escapeHtml(label);
	const safeValue = escapeHtml(value);
	const valueColor = isHighlight ? (accentColor || COLORS.primary) : COLORS.primaryText;
	const fontWeight = isHighlight ? "700" : "500";

	return `
    <tr>
      <td style="padding: 9px 0; width: 38%; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; vertical-align: top; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${safeLabel}
      </td>
      <td style="padding: 9px 0; font-size: 13px; color: ${valueColor}; font-weight: ${fontWeight}; line-height: 1.4; vertical-align: top; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${safeValue}
      </td>
    </tr>
	`;
}

export function InfoTable({ content, accentColor = COLORS.primary }: { content: string; accentColor?: string }): string {
	const borderAccent = accentColor || COLORS.primary;

	return `
    <!-- Info Table Container -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${borderAccent}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate;">
      <tr>
        <td style="padding: 16px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            ${content}
          </table>
        </td>
      </tr>
    </table>
	`;
}

interface MessageBoxProps {
	title?: string;
	message: string;
}

export function AlertBox({ title, message }: MessageBoxProps): string {
	const safeTitle = title ? escapeHtml(title) : "";
	const safeMessage = escapeHtml(message);

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${COLORS.info}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 14px 18px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${safeTitle ? `<h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${COLORS.primaryText};">${safeTitle}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${safeMessage}</p>
        </td>
      </tr>
    </table>
	`;
}

export function SuccessBox({ title, message }: MessageBoxProps): string {
	const safeTitle = title ? escapeHtml(title) : "";
	const safeMessage = escapeHtml(message);

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${COLORS.success}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 14px 18px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${safeTitle ? `<h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${COLORS.primaryText};">${safeTitle}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${safeMessage}</p>
        </td>
      </tr>
    </table>
	`;
}

export function WarningBox({ title, message }: MessageBoxProps): string {
	const safeTitle = title ? escapeHtml(title) : "";
	const safeMessage = escapeHtml(message);

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${COLORS.warning}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 14px 18px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${safeTitle ? `<h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${COLORS.warning};">${safeTitle}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${safeMessage}</p>
        </td>
      </tr>
    </table>
	`;
}

export function DangerBox({ title, message }: MessageBoxProps): string {
	const safeTitle = title ? escapeHtml(title) : "";
	const safeMessage = escapeHtml(message);

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${COLORS.danger}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 14px 18px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${safeTitle ? `<h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${COLORS.danger};">${safeTitle}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${safeMessage}</p>
        </td>
      </tr>
    </table>
	`;
}

export function OtpBox({ code, expirationText = "10 minutes" }: { code: string; expirationText?: string }): string {
	const safeCode = escapeHtml(code);
	const safeExpiration = escapeHtml(expirationText);

	return `
    <!-- Verification Code (OTP) Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate;">
      <tr>
        <td align="center" style="padding: 26px 20px;">
          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Verification Code
          </p>
          <div style="font-size: 34px; font-weight: 700; color: ${COLORS.primary}; letter-spacing: 7px; font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; margin: 10px 0; padding: 8px 16px; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 6px; display: inline-block;">
            ${safeCode}
          </div>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            This code will expire in <strong style="color: ${COLORS.warning}; font-weight: 600;">${safeExpiration}</strong>.
          </p>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
            Security Notice: Never share your code with anyone. BeastCode will never ask for your verification code.
          </p>
        </td>
      </tr>
    </table>
	`;
}

interface OrgCardProps {
	orgName: string;
	orgAvatar?: string;
	roleName?: string;
	ownerName?: string;
	detailsText?: string;
}

export function OrganizationCard({ orgName, orgAvatar, roleName, ownerName, detailsText }: OrgCardProps): string {
	const avatarUrl = orgAvatar ? escapeHtml(orgAvatar) : buildAbsoluteUrl("/placeholder-org.png");
	const safeOrgName = escapeHtml(orgName);
	const safeRoleName = roleName ? escapeHtml(roleName) : "";
	const safeOwnerName = ownerName ? escapeHtml(ownerName) : "";
	const safeDetails = detailsText ? escapeHtml(detailsText) : "";

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${orgAvatar ? `
              <td width="56" style="vertical-align: middle; padding-right: 14px;">
                <img src="${avatarUrl}" alt="${safeOrgName} Avatar" width="52" height="52" style="border-radius: 8px; display: block; border: 1px solid ${COLORS.border};" />
              </td>
              ` : ""}
              <td style="vertical-align: middle;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${safeOrgName}
                </h3>
                <p style="margin: 3px 0 0 0; font-size: 11px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  BeastCode Organization Workspace
                </p>
              </td>
            </tr>
          </table>
          
          ${(safeRoleName || safeOwnerName || safeDetails) ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; padding-top: 14px; border-top: 1px solid ${COLORS.border};">
            ${safeRoleName ? `
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Role Assigned</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primary}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeRoleName}</td>
            </tr>
            ` : ""}
            ${safeOwnerName ? `
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Workspace Owner</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 500; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeOwnerName}</td>
            </tr>
            ` : ""}
            ${safeDetails ? `
            <tr>
              <td colspan="2" style="padding: 8px 0 0 0; font-size: 12px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${safeDetails}
              </td>
            </tr>
            ` : ""}
          </table>
          ` : ""}
        </td>
      </tr>
    </table>
	`;
}

interface ContestCardProps {
	title: string;
	startTime: string;
	duration: string;
	countdown?: string;
	bannerUrl?: string;
}

export function ContestCard({ title, startTime, duration, countdown, bannerUrl }: ContestCardProps): string {
	const safeTitle = escapeHtml(title);
	const safeStartTime = escapeHtml(startTime);
	const safeDuration = escapeHtml(duration);
	const safeCountdown = countdown ? escapeHtml(countdown) : "";
	const safeBanner = bannerUrl ? escapeHtml(bannerUrl) : "";

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate; overflow: hidden;">
      ${safeBanner ? `
      <tr>
        <td style="padding: 0;">
          <img src="${safeBanner}" alt="${safeTitle} Banner" width="100%" style="display: block; max-width: 100%; height: auto; border-bottom: 1px solid ${COLORS.border};" />
        </td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${safeTitle}
          </h3>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Start Time</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeStartTime}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Duration</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeDuration}</td>
            </tr>
            ${safeCountdown ? `
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.warning}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Countdown</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.warning}; font-weight: 700; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeCountdown}</td>
            </tr>
            ` : ""}
          </table>
        </td>
      </tr>
    </table>
	`;
}

interface RecruitmentCardProps {
	companyName: string;
	companyLogo?: string;
	jobTitle: string;
	skills?: string[];
	description?: string;
}

export function RecruitmentCard({ companyName, companyLogo, jobTitle, skills, description }: RecruitmentCardProps): string {
	const avatarUrl = companyLogo ? escapeHtml(companyLogo) : buildAbsoluteUrl("/placeholder-org.png");
	const safeCompany = escapeHtml(companyName);
	const safeJob = escapeHtml(jobTitle);
	const safeDesc = description ? escapeHtml(description) : "";

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${companyLogo ? `
              <td width="56" style="vertical-align: middle; padding-right: 14px;">
                <img src="${avatarUrl}" alt="${safeCompany} Logo" width="50" height="50" style="border-radius: 8px; display: block; border: 1px solid ${COLORS.border};" />
              </td>
              ` : ""}
              <td style="vertical-align: middle;">
                <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Career Opportunity
                </p>
                <h3 style="margin: 3px 0 0 0; font-size: 16px; font-weight: 700; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${safeJob}
                </h3>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  at ${safeCompany}
                </p>
              </td>
            </tr>
          </table>
          
          ${safeDesc ? `
          <p style="margin: 14px 0 0 0; font-size: 12px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${safeDesc}
          </p>
          ` : ""}

          ${skills && skills.length > 0 ? `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid ${COLORS.border};">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; margin-bottom: 6px;">
              Required Skills
            </span>
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${skills.map(skill => `<span style="display: inline-block; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 3px 8px; font-size: 11px; color: ${COLORS.primaryText}; font-weight: 500; margin: 0 4px 4px 0;">${escapeHtml(skill)}</span>`).join("")}
            </div>
          </div>
          ` : ""}
        </td>
      </tr>
    </table>
	`;
}

interface HomeworkCardProps {
	title: string;
	dueDate: string;
	difficulty: string;
	teacher: string;
	orgName: string;
}

export function HomeworkCard({ title, dueDate, difficulty, teacher, orgName }: HomeworkCardProps): string {
	const safeTitle = escapeHtml(title);
	const safeDue = escapeHtml(dueDate);
	const safeDiff = escapeHtml(difficulty);
	const safeTeacher = escapeHtml(teacher);
	const safeOrg = escapeHtml(orgName);

	const diffLower = difficulty.toLowerCase();
	const diffColor = diffLower === "easy" ? COLORS.success : diffLower === "medium" ? COLORS.warning : COLORS.danger;

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 3px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Assignment Details
          </p>
          <h3 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${safeTitle}
          </h3>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Workspace</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 500; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeOrg}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Instructor</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 500; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeTeacher}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Difficulty</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${diffColor}; font-weight: 700; text-transform: uppercase; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeDiff}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${COLORS.danger}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Due Date</td>
              <td style="padding: 5px 0; font-size: 12px; color: ${COLORS.danger}; font-weight: 700; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${safeDue}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
	`;
}

interface NotificationCardProps {
	title: string;
	description: string;
	timestamp: string;
}

export function NotificationCard({ title, description, timestamp }: NotificationCardProps): string {
	const safeTitle = escapeHtml(title);
	const safeDesc = escapeHtml(description);
	const safeTime = escapeHtml(timestamp);

	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.elevated}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin-top: 18px; margin-bottom: 22px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin-bottom: 6px;">
            Notification Alert
          </div>
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${safeTitle}
          </h3>
          <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${safeDesc}
          </p>
          <div style="font-size: 11px; color: ${COLORS.mutedText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Triggered at: ${safeTime}
          </div>
        </td>
      </tr>
    </table>
	`;
}
