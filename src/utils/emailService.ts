import { getAdminFirestore } from "@/firebase/firebaseAdmin";
import nodemailer from "nodemailer";
import { logNotificationSent } from "./notificationService";

export interface QueueItem {
	id: string;
	toEmail: string;
	toUid: string;
	category: string;
	eventType: string;
	subject: string;
	emailHtml: string;
	status: "pending" | "processing" | "sent" | "failed";
	retryCount: number;
	nextRetryAt: number;
	createdAt: number;
	eventId: string;
	metadata?: any;
}

export class EmailService {
	private static transporter: nodemailer.Transporter | null = null;
	private static mailFrom: string = "";

	/**
	 * Configures SMTP transporter or fallback to Ethereal account
	 */
	public static async getTransporter(): Promise<{ transporter: nodemailer.Transporter | null; mailFrom: string }> {
		if (this.transporter) {
			return { transporter: this.transporter, mailFrom: this.mailFrom };
		}

		const smtpHost = process.env.SMTP_HOST;
		const smtpPort = parseInt(process.env.SMTP_PORT || "587");
		const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER;
		const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || process.env.MAIL_PASSWORD;
		const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || (smtpUser ? `"BeastCode Platform" <${smtpUser}>` : '"BeastCode" <support@beastcode.codes>');

		if (smtpHost && smtpUser && smtpPass) {
			console.log(`[EMAIL DEBUG] Initializing SMTP Transporter for host=${smtpHost}:${smtpPort}, user=${smtpUser}`);
			this.transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort,
				secure: smtpPort === 465,
				auth: { user: smtpUser, pass: smtpPass }
			});
			this.mailFrom = smtpFrom;
		} else {
			console.warn(`[EMAIL DEBUG] Missing SMTP credentials: host=${!!smtpHost}, user=${!!smtpUser}, pass=${!!smtpPass}`);
			// fallback: Create a dummy test SMTP account (Ethereal Email) with a 3-second timeout
			try {
				const testAccountPromise = nodemailer.createTestAccount();
				const timeoutPromise = new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("Timeout establishing connection to Ethereal SMTP service")), 3000)
				);
				const testAccount = await Promise.race([testAccountPromise, timeoutPromise]);
				this.transporter = nodemailer.createTransport({
					host: "smtp.ethereal.email",
					port: 587,
					secure: false,
					auth: {
						user: testAccount.user,
						pass: testAccount.pass
					}
				});
				this.mailFrom = `"BeastCode Test Account" <${testAccount.user}>`;
				console.log(`[EMAIL DEBUG] Configured fallback Ethereal SMTP with user: ${testAccount.user}`);
			} catch (etherealErr: any) {
				console.warn("[EMAIL DEBUG] Ethereal SMTP setup failed or timed out:", etherealErr.message);
				this.transporter = null;
				this.mailFrom = '"BeastCode Local Failsafe" <failsafe@beastcode.codes>';
			}
		}

		return { transporter: this.transporter, mailFrom: this.mailFrom };
	}

	/**
	 * Main queue processor. Fetches active items from emailQueue, delivers them,
	 * updates status, schedules retries, and logs statistics.
	 */
	public static async processQueue(): Promise<{ processedCount: number; durationMs: number; details: any[] }> {
		const startTime = Date.now();
		const db = getAdminFirestore();

		// Fetch pending and failed queue items (split queries to avoid composite index requirement)
		const [pendingSnap, failedSnap] = await Promise.all([
			db.collection("emailQueue")
				.where("status", "==", "pending")
				.get(),
			db.collection("emailQueue")
				.where("status", "==", "failed")
				.get()
		]);

		const now = Date.now();
		const allDocs = [...pendingSnap.docs, ...failedSnap.docs];

		const items: QueueItem[] = allDocs
			.map(doc => ({
				id: doc.id,
				...doc.data()
			}) as QueueItem)
			.filter(item => item.nextRetryAt <= now)
			.sort((a, b) => a.nextRetryAt - b.nextRetryAt)
			.slice(0, 10);

		if (items.length === 0) {
			return { processedCount: 0, durationMs: Date.now() - startTime, details: [] };
		}

		// Filter items to ensure they haven't exceeded retry limit (5 retries max)
		const activeItems = items.filter(item => item.retryCount < 5);

		if (activeItems.length === 0) {
			return { processedCount: 0, durationMs: Date.now() - startTime, details: [] };
		}

		console.log(`[EMAIL DEBUG] Queue processing started for ${activeItems.length} task(s).`);
		const { transporter, mailFrom } = await this.getTransporter();
		const results: any[] = [];

		await Promise.all(
			activeItems.map(async (item) => {
				const itemRef = db.collection("emailQueue").doc(item.id);
				
				// Mark item as processing to prevent race conditions
				await itemRef.update({ status: "processing" });

				const processStart = Date.now();
				let success = false;
				let errorMsg = "";
				let testPreviewUrl = "";
				let messageId = "";

				if (transporter) {
					try {
						console.log(`[EMAIL DEBUG] Queue processing item ${item.id} -> ${item.toEmail} (${item.subject})`);
						const info = await transporter.sendMail({
							from: mailFrom,
							to: item.toEmail,
							subject: item.subject,
							html: item.emailHtml
						});

						success = true;
						messageId = info.messageId || "";
						console.log(`[EMAIL DEBUG] Provider accepted queue message ${item.id}. Message ID: ${messageId}, Response: ${info.response}`);

						if (mailFrom.includes("ethereal.email")) {
							testPreviewUrl = nodemailer.getTestMessageUrl(info) || "";
						}
					} catch (sendErr: any) {
						errorMsg = sendErr.message || "Failed to send email via SMTP transporter.";
						console.error(`[EMAIL DEBUG] Provider rejected queue message ${item.id} (${item.toEmail}):`, sendErr);
					}
				} else {
					errorMsg = "No SMTP transporter or test account available.";
					console.error(`[EMAIL DEBUG] Queue task ${item.id} failed: No SMTP transporter available.`);
				}

				const duration = Date.now() - processStart;

				if (success) {
					await itemRef.update({
						status: "sent",
						sentAt: Date.now(),
						messageId,
						deliveryDurationMs: duration,
						previewUrl: testPreviewUrl || null,
						error: null
					});

					// Log to duplicates / limits collection
					await logNotificationSent(item.toEmail, item.category, item.eventId);

					// Record stats transactionally
					const statsRef = db.collection("emailStats").doc("analytics");
					try {
						await db.runTransaction(async (transaction) => {
							const docSnap = await transaction.get(statsRef);
							if (!docSnap.exists) {
								transaction.set(statsRef, {
									sentCount: 1,
									failedCount: 0,
									totalDurationMs: duration,
									averageDurationMs: duration
								});
							} else {
								const data = docSnap.data() || {};
								const newSent = (data.sentCount || 0) + 1;
								const newTotalDuration = (data.totalDurationMs || 0) + duration;
								transaction.update(statsRef, {
									sentCount: newSent,
									totalDurationMs: newTotalDuration,
									averageDurationMs: Math.round(newTotalDuration / newSent)
								});
							}
						});
					} catch (statsErr) {
						console.warn("[EmailService Stats Warn] Failed to update analytics:", statsErr);
					}

					results.push({
						id: item.id,
						recipient: item.toEmail,
						status: "sent",
						messageId,
						previewUrl: testPreviewUrl || undefined
					});
				} else {
					const nextCount = item.retryCount + 1;
					const backoffMinutes = Math.pow(2, nextCount);
					const nextRetryAt = Date.now() + backoffMinutes * 60 * 1000;

					await itemRef.update({
						status: "failed",
						retryCount: nextCount,
						nextRetryAt,
						error: errorMsg
					});

					// Record failed stats transactionally
					const statsRef = db.collection("emailStats").doc("analytics");
					try {
						await db.runTransaction(async (transaction) => {
							const docSnap = await transaction.get(statsRef);
							if (!docSnap.exists) {
								transaction.set(statsRef, {
									sentCount: 0,
									failedCount: 1,
									totalDurationMs: 0,
									averageDurationMs: 0
								});
							} else {
								const data = docSnap.data() || {};
								transaction.update(statsRef, {
									failedCount: (data.failedCount || 0) + 1
								});
							}
						});
					} catch (statsErr) {
						console.warn("[EmailService Stats Warn] Failed to update analytics for failure:", statsErr);
					}

					results.push({
						id: item.id,
						recipient: item.toEmail,
						status: "failed",
						retryCount: nextCount,
						nextRetryAt: new Date(nextRetryAt).toLocaleString(),
						error: errorMsg
					});
				}
			})
		);

		return {
			processedCount: activeItems.length,
			durationMs: Date.now() - startTime,
			details: results
		};
	}

	/**
	 * Sends an email directly and synchronously via SMTP.
	 * Returns rich delivery details object.
	 */
	public static async sendDirectEmailResult(to: string, subject: string, html: string): Promise<{
		success: boolean;
		messageId?: string;
		response?: string;
		error?: string;
	}> {
		console.log(`[EMAIL DEBUG] Email service invoked for recipient: ${to}`);
		console.log(`[EMAIL DEBUG] Subject: "${subject}"`);
		console.log(`[EMAIL DEBUG] Template rendered successfully (HTML size: ${html.length} bytes)`);

		const { transporter, mailFrom } = await this.getTransporter();
		if (!transporter) {
			const errMsg = "SMTP transporter not available. Please verify server environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).";
			console.error(`[EMAIL DEBUG] ${errMsg}`);
			return { success: false, error: errMsg };
		}

		try {
			console.log(`[EMAIL DEBUG] Attempting SMTP connection to send email to ${to}...`);
			const info = await transporter.sendMail({
				from: mailFrom,
				to,
				subject,
				html
			});

			console.log(`[EMAIL DEBUG] Provider ACCEPTED message for ${to}!`);
			console.log(`[EMAIL DEBUG] Provider Message ID: ${info.messageId}`);
			console.log(`[EMAIL DEBUG] Provider Response: ${info.response}`);

			return {
				success: true,
				messageId: info.messageId,
				response: info.response
			};
		} catch (sendErr: any) {
			const errMsg = sendErr.message || "Unknown SMTP provider delivery failure.";
			console.error(`[EMAIL DEBUG] Provider REJECTED message for ${to}:`, sendErr);
			return {
				success: false,
				error: errMsg
			};
		}
	}

	/**
	 * Sends an email directly and synchronously.
	 * Returns true ONLY if SMTP provider accepted the message.
	 */
	public static async sendDirectEmail(to: string, subject: string, html: string): Promise<boolean> {
		const res = await this.sendDirectEmailResult(to, subject, html);
		return res.success;
	}
}
