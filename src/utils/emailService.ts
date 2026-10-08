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
	status: "pending" | "processing" | "sent" | "failed" | "dead_letter" | "expired" | "cancelled";
	retryCount: number;
	nextRetryAt: number;
	createdAt: number;
	eventId: string;
	expiresAt?: number;
	claimedAt?: number;
	leaseUntil?: number | null;
	lastAttemptAt?: number;
	sentAt?: number;
	messageId?: string;
	deliveryDurationMs?: number;
	previewUrl?: string | null;
	error?: string | null;
	metadata?: any;
}

export interface EventValidationResult {
	valid: boolean;
	terminalStatus?: "expired" | "cancelled";
	reason?: string;
}

/**
 * Robust timestamp parser supporting epoch numbers, Firestore Timestamp objects,
 * Date instances, and ISO date strings.
 */
export function parseTimestamp(val: any): number {
	if (!val) return 0;
	if (typeof val === "number") return isNaN(val) ? 0 : val;
	if (typeof val?.toMillis === "function") return val.toMillis();
	if (typeof val?._seconds === "number") return val._seconds * 1000;
	if (typeof val?.seconds === "number") return val.seconds * 1000;
	if (val instanceof Date) return val.getTime();
	if (typeof val === "string") {
		const parsed = Date.parse(val);
		return isNaN(parsed) ? 0 : parsed;
	}
	return 0;
}

/**
 * Sanitizes and upgrades legacy pre-rendered HTML in outbox items
 * so old queue items never display deprecated navy, orange, or test domains.
 */
export function sanitizeOutboxHtml(html: string): string {
	if (!html) return "";
	let sanitized = html;
	sanitized = sanitized.replace(/#0B1020/gi, "#080909");
	sanitized = sanitized.replace(/#131B2E/gi, "#0f1210");
	sanitized = sanitized.replace(/#1F2937/gi, "#151816");
	sanitized = sanitized.replace(/#FF8A00/gi, "#22c55e");
	sanitized = sanitized.replace(/#00D4FF/gi, "#22c55e");
	return sanitized;
}

/**
 * Extracts contestId from metadata or deterministic eventId pattern.
 */
export function extractContestIdFromItem(item: QueueItem): string | null {
	if (item.metadata?.contestId) return String(item.metadata.contestId);
	if (item.metadata?.cid) return String(item.metadata.cid);

	const eventId = item.eventId || "";
	// contest-published-${contestId}-${u.uid}
	const pubMatch = eventId.match(/^contest-published-(.+)-([^-]+)$/);
	if (pubMatch) return pubMatch[1];

	// contest-reminder-15m-${contest.id}-${u.uid}
	const remMatch = eventId.match(/^contest-reminder(?:-[^-]+)?-(.+)-([^-]+)$/);
	if (remMatch) return remMatch[1];

	// reg-confirm-${contestId}-${uid}
	const regMatch = eventId.match(/^reg-confirm-(.+)-([^-]+)$/);
	if (regMatch) return regMatch[1];

	// contest-virtual-${action}-${contestId}-${u.uid}
	const virtMatch = eventId.match(/^contest-virtual-(?:enabled|disabled)-(.+)-([^-]+)$/);
	if (virtMatch) return virtMatch[1];

	// security-alert-${contestId}-${uid}
	const secMatch = eventId.match(/^security-alert-(.+)-([^-]+)$/);
	if (secMatch) return secMatch[1];

	// Fallback: extract title or ID from subject for legacy queue items
	if (item.subject) {
		const schedMatch = item.subject.match(/\[New Contest\]\s*(.+?)\s+has been scheduled/i);
		if (schedMatch) return schedMatch[1].trim();
		const regSubMatch = item.subject.match(/\[BeastCode\] Registration Confirmed:\s*(.+)/i);
		if (regSubMatch) return regSubMatch[1].trim();
	}

	return null;
}

/**
 * Revalidates an outbox event before SMTP delivery to ensure historical or invalid
 * events are never delivered.
 */
export async function validateEventForDelivery(
	dbOrItem: any,
	itemOrNow?: any,
	maybeNow?: number
): Promise<EventValidationResult> {
	let db: any;
	let item: QueueItem;
	let now: number;

	if (dbOrItem && typeof dbOrItem.collection === "function") {
		db = dbOrItem;
		item = itemOrNow;
		now = typeof maybeNow === "number" ? maybeNow : Date.now();
	} else {
		db = getAdminFirestore();
		item = dbOrItem;
		now = typeof itemOrNow === "number" ? itemOrNow : Date.now();
	}

	// 1. Explicit expiration check
	const itemExpiresAt = parseTimestamp(item.expiresAt);
	if (itemExpiresAt > 0 && now > itemExpiresAt) {
		return {
			valid: false,
			terminalStatus: "expired",
			reason: `Notification expired at ${new Date(itemExpiresAt).toISOString()} (current time: ${new Date(now).toISOString()})`
		};
	}

	// 2. Contest-specific business validation
	const isContestCategory = item.category === "contest";
	const isContestEvent = item.eventType.startsWith("CONTEST_") || item.eventType === "VIRTUAL_MODE";
	const contestId = extractContestIdFromItem(item);

	if (isContestCategory || isContestEvent || contestId) {
		if (!contestId) {
			if (isContestCategory || isContestEvent) {
				return {
					valid: false,
					terminalStatus: "cancelled",
					reason: `Missing contestId for contest event ${item.eventType} (eventId: ${item.eventId || "N/A"})`
				};
			}
		} else {
			// Fetch contest from Firestore
			const contestDoc = await db.collection("contests").doc(contestId).get();
			if (!contestDoc.exists) {
				return {
					valid: false,
					terminalStatus: "cancelled",
					reason: `Contest "${contestId}" does not exist in database (not found)`
				};
			}

			const contest = contestDoc.data() || {};
			const contestStatus = String(contest.status || "draft").toLowerCase();
			const startTime = parseTimestamp(contest.startTime);
			let endTime = parseTimestamp(contest.endTime);
			if (endTime === 0 && startTime > 0) {
				const durationMinutes = typeof contest.duration === "number" ? contest.duration : 120;
				endTime = startTime + durationMinutes * 60000;
			}

			if (contestStatus === "cancelled") {
				return {
					valid: false,
					terminalStatus: "cancelled",
					reason: `Contest "${contestId}" is cancelled`
				};
			}

			if (contestStatus === "archived") {
				return {
					valid: false,
					terminalStatus: "expired",
					reason: `Contest "${contestId}" is archived`
				};
			}

			if (contestStatus === "draft" && !(item.eventId && item.eventId.startsWith("test-"))) {
				return {
					valid: false,
					terminalStatus: "cancelled",
					reason: `Contest "${contestId}" is in draft status`
				};
			}

			// Time-based validations for contest events
			if (item.eventType === "CONTEST_PUBLISHED") {
				// An announcement for a contest that already ended is strictly expired!
				if (contestStatus === "ended" || (endTime > 0 && now >= endTime)) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Contest "${contestId}" has already ended (ended: ${endTime ? new Date(endTime).toISOString() : "N/A"})`
					};
				}
				// Also, if more than 24 hours have passed since contest start time, announcement is stale
				if (startTime > 0 && now > startTime + 24 * 60 * 60 * 1000) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Contest "${contestId}" announcement is over 24 hours past contest start`
					};
				}
			}

			if (
				item.eventType === "CONTEST_SOON" ||
				item.eventType === "CONTEST_REG_REMINDER" ||
				item.eventType.startsWith("CONTEST_STARTING_")
			) {
				// Reminders cannot be delivered after the contest has already started!
				if (startTime > 0 && now >= startTime) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Contest "${contestId}" has already started (started: ${new Date(startTime).toISOString()})`
					};
				}
				if (contestStatus === "ended" || (endTime > 0 && now >= endTime)) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Contest "${contestId}" has already ended`
					};
				}
			}

			if (item.eventType === "CONTEST_REG_CONFIRM") {
				// Registration confirmation is meaningless if the contest has already ended
				if (contestStatus === "ended" || (endTime > 0 && now >= endTime)) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Contest "${contestId}" registration confirmation expired because contest has already ended`
					};
				}
			}

			if (item.eventType === "VIRTUAL_MODE") {
				const action = item.metadata?.action || "enabled";
				if (action === "enabled" && contest.virtualEnabled === false) {
					return {
						valid: false,
						terminalStatus: "expired",
						reason: `Virtual mode is not enabled for contest "${contestId}"`
					};
				}
			}
		}
	}

	// 3. Global opt-out verification
	try {
		const emailLower = item.toEmail.toLowerCase().trim();
		const optDoc = await db.collection("globalOptOuts").doc(emailLower).get();
		if (optDoc.exists) {
			const optType = optDoc.data()?.type || "all";
			if (optType === "all" || optType === item.category) {
				return {
					valid: false,
					terminalStatus: "cancelled",
					reason: `Recipient ${emailLower} is in globalOptOuts`
				};
			}
		}
	} catch {
		// Proceed if optOuts check fails non-critically
	}

	return { valid: true };
}

export class EmailService {
	public static validateEventForDelivery = validateEventForDelivery;
	public static extractContestIdFromItem = extractContestIdFromItem;
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
	 * Main queue processor. Fetches active items from emailQueue, revalidates them,
	 * claims them atomically with a lease lock, delivers via SMTP, schedules retries,
	 * and transitions stale or permanently failed records to terminal states.
	 */
	public static async processQueue(): Promise<{ processedCount: number; durationMs: number; details: any[] }> {
		const startTime = Date.now();
		const db = getAdminFirestore();
		const now = Date.now();

		// Fetch pending, failed, and expired-lease processing documents
		const [pendingSnap, failedSnap, processingSnap] = await Promise.all([
			db.collection("emailQueue")
				.where("status", "==", "pending")
				.limit(50)
				.get(),
			db.collection("emailQueue")
				.where("status", "==", "failed")
				.limit(50)
				.get(),
			db.collection("emailQueue")
				.where("status", "==", "processing")
				.limit(50)
				.get()
		]);

		const allDocs = [...pendingSnap.docs, ...failedSnap.docs, ...processingSnap.docs];

		// Filter candidates:
		// 1. Pending: nextRetryAt <= now
		// 2. Failed: nextRetryAt <= now and retryCount < 5 (if >= 5, handled in transaction to mark dead_letter)
		// 3. Processing: leaseUntil <= now (stuck worker recovery)
		const candidateItems: QueueItem[] = allDocs
			.map(doc => ({
				id: doc.id,
				...doc.data()
			}) as QueueItem)
			.filter(item => {
				if (item.status === "processing") {
					return typeof item.leaseUntil === "number" && item.leaseUntil <= now;
				}
				if (item.status === "failed") {
					return item.nextRetryAt <= now;
				}
				return item.nextRetryAt <= now;
			})
			.sort((a, b) => (a.nextRetryAt || a.createdAt) - (b.nextRetryAt || b.createdAt));

		if (candidateItems.length === 0) {
			return { processedCount: 0, durationMs: Date.now() - startTime, details: [] };
		}

		// Take up to 50 candidates to process in this run
		const targetBatch = candidateItems.slice(0, 50);
		const claimedItems: QueueItem[] = [];
		const results: any[] = [];

		// Atomically claim each candidate using Firestore transaction
		for (const candidate of targetBatch) {
			const itemRef = db.collection("emailQueue").doc(candidate.id);
			try {
				const claimedItem = await db.runTransaction(async (transaction) => {
					const docSnap = await transaction.get(itemRef);
					if (!docSnap.exists) return null;

					const data = docSnap.data() as QueueItem;

					// Terminal state check: already completed
					if (
						data.status === "sent" ||
						data.status === "dead_letter" ||
						data.status === "expired" ||
						data.status === "cancelled"
					) {
						return null;
					}

					// Active lease check: another worker is currently processing this item
					if (data.status === "processing") {
						if (typeof data.leaseUntil === "number" && data.leaseUntil > now) {
							return null;
						}
					}

					// Max retry limit check: isolate to dead_letter to prevent queue head-of-line blocking
					if (data.retryCount >= 5) {
						transaction.update(itemRef, {
							status: "dead_letter",
							error: data.error || "Exceeded maximum retry limit (5 retries)",
							updatedAt: now
						});
						results.push({
							id: candidate.id,
							recipient: data.toEmail,
							status: "dead_letter",
							reason: "Retry limit exceeded"
						});
						return null;
					}

					// Pre-send business and expiration revalidation
					const validation = await validateEventForDelivery(db, { ...data, id: docSnap.id }, now);
					if (!validation.valid) {
						const terminalStatus = validation.terminalStatus || "expired";
						console.log(`[EMAIL QUEUE SKIP] Item ${candidate.id} (${data.eventType}) invalidated: ${validation.reason}`);
						transaction.update(itemRef, {
							status: terminalStatus,
							error: validation.reason,
							updatedAt: now
						});
						results.push({
							id: candidate.id,
							recipient: data.toEmail,
							status: terminalStatus,
							reason: validation.reason
						});
						return null;
					}

					// Claim the document with a 5-minute lease lock
					const leaseDuration = 5 * 60 * 1000;
					transaction.update(itemRef, {
						status: "processing",
						claimedAt: now,
						leaseUntil: now + leaseDuration,
						lastAttemptAt: now
					});

					return {
						...data,
						id: docSnap.id,
						status: "processing",
						claimedAt: now,
						leaseUntil: now + leaseDuration
					} as QueueItem;
				});

				if (claimedItem) {
					claimedItems.push(claimedItem);
				}
			} catch (claimErr: any) {
				console.warn(`[EMAIL QUEUE CLAIM WARN] Failed to claim item ${candidate.id}:`, claimErr.message);
			}
		}

		if (claimedItems.length === 0) {
			return { processedCount: 0, durationMs: Date.now() - startTime, details: results };
		}

		console.log(`[EMAIL DEBUG] Queue processing claimed ${claimedItems.length} task(s).`);
		const { transporter, mailFrom } = await this.getTransporter();

		// Deliver claimed items via SMTP in concurrency-limited chunks of 5
		const CHUNK_SIZE = 5;
		for (let i = 0; i < claimedItems.length; i += CHUNK_SIZE) {
			const chunk = claimedItems.slice(i, i + CHUNK_SIZE);
			await Promise.all(
				chunk.map(async (item) => {
				const itemRef = db.collection("emailQueue").doc(item.id);
				const processStart = Date.now();
				let success = false;
				let errorMsg = "";
				let testPreviewUrl = "";
				let messageId = "";

				if (transporter) {
					try {
						console.log(`[EMAIL DEBUG] Queue delivering item ${item.id} -> ${item.toEmail} (${item.subject})`);
						const info = await transporter.sendMail({
							from: mailFrom,
							to: item.toEmail,
							subject: item.subject,
							html: sanitizeOutboxHtml(item.emailHtml)
						});

						success = true;
						messageId = info.messageId || "";
						console.log(`[EMAIL DEBUG] Provider accepted queue message ${item.id}. Message ID: ${messageId}`);

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
					await itemRef.set({
						status: "sent",
						sentAt: Date.now(),
						messageId,
						deliveryDurationMs: duration,
						previewUrl: testPreviewUrl || null,
						leaseUntil: null,
						error: null
					}, { merge: true });

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
					if (nextCount >= 5) {
						await itemRef.set({
							status: "dead_letter",
							retryCount: nextCount,
							leaseUntil: null,
							error: errorMsg,
							failedAt: Date.now()
						}, { merge: true });
					} else {
						const backoffMinutes = Math.pow(2, nextCount);
						const nextRetryAt = Date.now() + backoffMinutes * 60 * 1000;

						await itemRef.set({
							status: "failed",
							retryCount: nextCount,
							nextRetryAt,
							leaseUntil: null,
							error: errorMsg
						}, { merge: true });
					}

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
						status: nextCount >= 5 ? "dead_letter" : "failed",
						retryCount: nextCount,
						error: errorMsg
					});
				}
			})
		);
		}

		return {
			processedCount: claimedItems.length,
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
