/**
 * Centralized Email Component System for BeastCode
 * Enforces WCAG AA contrast standards, uses solid color hex values,
 * and maintains readability across Gmail, Outlook, Apple Mail, and mobile clients.
 */

import { getSiteUrl, buildAbsoluteUrl } from "./siteConfig";

// Official color palette
export const COLORS = {
	background: "#0B1020",
	card: "#131B2E",
	primary: "#FF8A00", // primary orange
	hover: "#FFA733",
	accent: "#00D4FF", // accent cyan
	success: "#00C853",
	warning: "#FFC107",
	danger: "#FF4D4F",
	primaryText: "#FFFFFF",
	secondaryText: "#A5B0C2",
	border: "#202C45"
};

interface EmailLayoutProps {
	previewText?: string;
	title: string;
	bodyContent: string;
}

export function EmailLayout({ previewText, title, bodyContent }: EmailLayoutProps): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: ${COLORS.primaryText};">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; color: ${COLORS.background};">${previewText}</div>` : ""}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 16px; overflow: hidden; border-collapse: separate; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
          ${bodyContent}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface EmailHeaderProps {
	headerTitle?: string;
	accentColor?: string;
}

export function EmailHeader({ headerTitle, accentColor = COLORS.primary }: EmailHeaderProps): string {
	return `
    <!-- Header Section -->
    <tr>
      <td align="center" style="padding: 40px 30px 25px 30px; background-color: ${COLORS.card}; border-bottom: 1px solid ${COLORS.border};">
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
          <tr>
            <td align="center" style="vertical-align: middle;">
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" stroke="${COLORS.primary}" stroke-width="6" stroke-linejoin="round" fill="${COLORS.background}" />
                <path d="M 37,32 L 21,50 L 37,68" stroke="${COLORS.primaryText}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 63,32 L 79,50 L 63,68" stroke="${COLORS.primaryText}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 57,26 L 43,74" stroke="${COLORS.primary}" stroke-width="8" stroke-linecap="round" />
              </svg>
            </td>
            <td style="font-size: 28px; font-weight: 900; letter-spacing: -1.5px; color: ${COLORS.primaryText}; padding-left: 14px; vertical-align: middle; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Beast<span style="color: ${COLORS.primary};">Code</span>
            </td>
          </tr>
        </table>
        
        <!-- Tagline & Brand tag -->
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${COLORS.secondaryText}; letter-spacing: 0.5px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Competitive Programming Platform
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: ${COLORS.accent}; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Learn. Practice. Compete.
        </p>
        
        ${headerTitle ? `
        <!-- Accent Badge -->
        <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="border: 1px solid ${accentColor}; border-radius: 20px; padding: 6px 16px; background-color: ${COLORS.background}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${accentColor}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${headerTitle}
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

	return `
    <!-- Footer Section -->
    <tr>
      <td style="padding: 35px; border-top: 1px solid ${COLORS.border}; background-color: ${COLORS.card}; text-align: center; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: ${COLORS.secondaryText}; font-weight: 500; line-height: 1.5;">
          Need help? <a href="mailto:support@beastcode.codes" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 600;">Contact Support</a>
        </p>
        <p style="margin: 0 0 18px 0; font-size: 12px; color: ${COLORS.secondaryText}; font-weight: 500;">
          <a href="${origin}" target="_blank" style="color: ${COLORS.accent}; text-decoration: none; margin: 0 10px; font-weight: 600;">Website</a> &bull;
          <a href="https://github.com" target="_blank" style="color: ${COLORS.accent}; text-decoration: none; margin: 0 10px; font-weight: 600;">GitHub</a> &bull;
          <a href="https://discord.gg" target="_blank" style="color: ${COLORS.accent}; text-decoration: none; margin: 0 10px; font-weight: 600;">Discord</a>
        </p>
        <p style="margin: 0 0 12px 0; font-size: 11px; color: ${COLORS.secondaryText}; line-height: 1.5; font-style: italic;">
          This email was automatically generated. Please do not reply.
        </p>
        <p style="margin: 0; font-size: 11px; color: ${COLORS.secondaryText}; opacity: 0.8;">
          &copy; 2026 BeastCode Platform. All rights reserved.
        </p>
        
        ${recipientEmail ? `
        <p style="margin: 15px 0 0 0; font-size: 10px; color: ${COLORS.secondaryText}; opacity: 0.6;">
          Sent to <span style="color: ${COLORS.primaryText}; font-weight: 600;">${recipientEmail}</span>. 
          <a href="${origin}/unsubscribe?email=${encodeURIComponent(recipientEmail)}${preferenceType ? `&type=${preferenceType}` : ""}" target="_blank" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 600;">Unsubscribe</a> 
          &nbsp;&bull;&nbsp; 
          <a href="${origin}/settings" target="_blank" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 600;">Notification Preferences</a>
        </p>
        ` : `
        <p style="margin: 15px 0 0 0; font-size: 10px; color: ${COLORS.secondaryText}; opacity: 0.6;">
          <a href="${origin}/settings" target="_blank" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 600;">Manage Preferences</a>
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
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 25px; margin-bottom: 25px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
            <tr>
              <td align="center" style="border-radius: 8px; background-color: ${accentColor}; box-shadow: 0 4px 12px rgba(255, 138, 0, 0.2);">
                <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 36px; color: ${COLORS.background}; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 8px; border: 1px solid ${accentColor}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${text}
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
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; margin-bottom: 20px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
            <tr>
              <td align="center" style="border-radius: 8px; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border};">
                <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 36px; color: ${COLORS.primaryText}; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 8px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${text}
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
	const labelColor = accentColor;
	const valueColor = isHighlight ? accentColor : COLORS.primaryText;
	const fontWeight = isHighlight ? "700" : "500";

	return `
    <tr>
      <td style="padding: 10px 0; width: 35%; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${labelColor}; vertical-align: top; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${label}
      </td>
      <td style="padding: 10px 0; font-size: 14px; color: ${valueColor}; font-weight: ${fontWeight}; line-height: 1.4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${value}
      </td>
    </tr>
	`;
}

export function InfoTable({ content, accentColor = COLORS.primary }: { content: string; accentColor?: string }): string {
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-left: 4px solid ${accentColor}; border-radius: 8px; margin-bottom: 25px; border-collapse: separate;">
      <tr>
        <td style="padding: 20px 20px;">
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
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121F3D; border: 1px solid ${COLORS.accent}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 16px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${title ? `<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: ${COLORS.primaryText};">${title}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${message}</p>
        </td>
      </tr>
    </table>
	`;
}

export function SuccessBox({ title, message }: MessageBoxProps): string {
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0E291D; border: 1px solid ${COLORS.success}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 16px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${title ? `<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: ${COLORS.primaryText};">${title}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${message}</p>
        </td>
      </tr>
    </table>
	`;
}

export function WarningBox({ title, message }: MessageBoxProps): string {
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #2F210F; border: 1px solid ${COLORS.warning}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 16px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${title ? `<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: ${COLORS.primaryText};">${title}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${message}</p>
        </td>
      </tr>
    </table>
	`;
}

export function DangerBox({ title, message }: MessageBoxProps): string {
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #2D1418; border: 1px solid ${COLORS.danger}; border-radius: 8px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td style="padding: 16px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${title ? `<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: ${COLORS.primaryText};">${title}</h4>` : ""}
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText};">${message}</p>
        </td>
      </tr>
    </table>
	`;
}

export function OtpBox({ code, expirationText = "10 minutes" }: { code: string; expirationText?: string }): string {
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate;">
      <tr>
        <td align="center" style="padding: 30px 24px;">
          <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Verification Code
          </p>
          <div style="font-size: 38px; font-weight: 800; color: ${COLORS.primary}; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; margin: 10px 0;">
            ${code}
          </div>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            This code will expire in <strong style="color: ${COLORS.warning};">${expirationText}</strong>.
          </p>
          <p style="margin: 15px 0 0 0; font-size: 11px; color: ${COLORS.secondaryText}; opacity: 0.7; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
            Security Reminder: Never share your verification code with anyone. BeastCode representatives will never ask for your code.
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
	const avatarUrl = orgAvatar || buildAbsoluteUrl("/placeholder-org.png");
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${orgAvatar ? `
              <td width="64" style="vertical-align: middle; padding-right: 16px;">
                <img src="${avatarUrl}" alt="${orgName} Avatar" width="60" height="60" style="border-radius: 12px; display: block; border: 1px solid ${COLORS.border};" />
              </td>
              ` : ""}
              <td style="vertical-align: middle;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${orgName}
                </h3>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  BeastCode Organization Workspace
                </p>
              </td>
            </tr>
          </table>
          
          ${(roleName || ownerName || detailsText) ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid ${COLORS.border};">
            ${roleName ? `
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.accent}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Role Assigned</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${roleName}</td>
            </tr>
            ` : ""}
            ${ownerName ? `
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.accent}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Workspace Owner</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${ownerName}</td>
            </tr>
            ` : ""}
            ${detailsText ? `
            <tr>
              <td colspan="2" style="padding: 10px 0 0 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${detailsText}
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
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate; overflow: hidden;">
      ${bannerUrl ? `
      <tr>
        <td style="padding: 0;">
          <img src="${bannerUrl}" alt="${title} Banner" width="100%" style="display: block; max-width: 100%; height: auto; border-bottom: 1px solid ${COLORS.border};" />
        </td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 24px;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 800; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${title}
          </h3>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Start Time</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${startTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.primary}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Duration</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${duration}</td>
            </tr>
            ${countdown ? `
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.warning}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Countdown</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.warning}; font-weight: 700; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${countdown}</td>
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
	const avatarUrl = companyLogo || buildAbsoluteUrl("/placeholder-org.png");
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${companyLogo ? `
              <td width="64" style="vertical-align: middle; padding-right: 16px;">
                <img src="${avatarUrl}" alt="${companyName} Logo" width="60" height="60" style="border-radius: 12px; display: block; border: 1px solid ${COLORS.border};" />
              </td>
              ` : ""}
              <td style="vertical-align: middle;">
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.accent}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Career Opportunity
                </p>
                <h3 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${jobTitle}
                </h3>
                <p style="margin: 2px 0 0 0; font-size: 13px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  at ${companyName}
                </p>
              </td>
            </tr>
          </table>
          
          ${description ? `
          <p style="margin: 15px 0 0 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${description}
          </p>
          ` : ""}

          ${skills && skills.length > 0 ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${COLORS.border};">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; margin-bottom: 8px;">
              Required Skills
            </span>
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${skills.map(skill => `<span style="display: inline-block; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 4px; padding: 4px 10px; font-size: 12px; color: ${COLORS.primaryText}; font-weight: 600; margin: 0 6px 6px 0;">${skill}</span>`).join("")}
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
	const diffColor = difficulty.toLowerCase() === "easy" ? COLORS.success : difficulty.toLowerCase() === "medium" ? COLORS.warning : COLORS.danger;
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.accent}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Assignment Details
          </p>
          <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 800; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${title}
          </h3>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Classroom/Org</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${orgName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Instructor</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.primaryText}; font-weight: 600; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${teacher}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Difficulty</td>
              <td style="padding: 6px 0; font-size: 12px; color: ${diffColor}; font-weight: 800; text-transform: uppercase; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${difficulty}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.danger}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Due Date</td>
              <td style="padding: 6px 0; font-size: 13px; color: ${COLORS.danger}; font-weight: 700; text-align: right; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${dueDate}</td>
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
	return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; border-collapse: separate; overflow: hidden;">
      <tr>
        <td style="padding: 24px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.accent}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin-bottom: 6px;">
            Notification Alert
          </div>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: ${COLORS.primaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${title}
          </h3>
          <p style="margin: 0 0 15px 0; font-size: 13px; line-height: 1.5; color: ${COLORS.secondaryText}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${description}
          </p>
          <div style="font-size: 11px; color: ${COLORS.secondaryText}; opacity: 0.6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Triggered at: ${timestamp}
          </div>
        </td>
      </tr>
    </table>
	`;
}
