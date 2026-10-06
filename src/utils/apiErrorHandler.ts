import { NextApiResponse, NextApiRequest } from "next";

export interface StandardApiErrorResponse {
	success: boolean;
	error: {
		code: string;
		message: string;
		details?: any;
	};
}

export type NextApiHandlerWithErrors = (
	req: NextApiRequest,
	res: NextApiResponse
) => void | Promise<void>;

/**
 * Standardized API error handling utility.
 * Sanitizes errors for production clients while preserving full traces in internal logs.
 */
export function handleApiError(
	error: any,
	req: NextApiRequest,
	res: NextApiResponse,
	defaultMessage: string = "Something went wrong.",
	customCode: string = "INTERNAL_SERVER_ERROR",
	statusCode: number = 500
) {
	const timestamp = new Date().toISOString();
	const route = req.url || "unknown";
	const method = req.method || "unknown";
	const isProduction = process.env.NODE_ENV === "production";

	// 1. Structured internal logging:
	console.error(`[API ERROR LOG] [${timestamp}] [${method} ${route}]`);
	if (error instanceof Error) {
		console.error(`Message: ${error.message}`);
		console.error(`Stack trace: ${error.stack}`);
	} else {
		console.error("Raw exception:", error);
	}

	// 2. Build the standardized client response payload:
	const responsePayload: StandardApiErrorResponse = {
		success: false,
		error: {
			code: customCode,
			message: isProduction ? defaultMessage : (error?.message || defaultMessage),
		},
	};

	// 3. Expose debug details only outside of production:
	if (!isProduction && error) {
		responsePayload.error.details = {
			rawMessage: error.message || null,
			stack: error.stack || null,
		};
	}

	return res.status(statusCode).json(responsePayload);
}

// ─── Firebase / Google error classifier ──────────────────────────────────────
// Maps known internal Firebase / GCP error codes to safe user-facing messages.
// The real error is always logged server-side before this runs.
function classifyFirebaseError(error: any): string | null {
	const code: string = error?.errorInfo?.code ?? error?.code ?? "";
	const rawMsg: string = error?.message ?? "";

	// ADC / quota project errors
	if (
		rawMsg.includes("quota project") ||
		rawMsg.includes("Application Default Credentials") ||
		rawMsg.includes("identitytoolkit") ||
		code === "auth/internal-error"
	) {
		return "Unable to process your request. Please try again later.";
	}

	// Permission / service-disabled
	if (
		rawMsg.includes("PERMISSION_DENIED") ||
		rawMsg.includes("SERVICE_DISABLED") ||
		code === "auth/insufficient-permission"
	) {
		return "Unable to process your request. Please try again later.";
	}

	// Invalid service account / credential errors
	if (
		code === "auth/invalid-credential" ||
		rawMsg.includes("invalid_grant") ||
		rawMsg.includes("invalid_client")
	) {
		return "Unable to process your request. Please try again later.";
	}

	// User not found (ok to surface gently)
	if (code === "auth/user-not-found") {
		return null; // caller handles this
	}

	// Generic Firebase errors
	if (code.startsWith("auth/") || code.startsWith("firestore/")) {
		return "Unable to process your request. Please try again later.";
	}

	return null; // not a Firebase error — let the caller decide
}

/**
 * HOF wrapper middleware for Next.js API route handlers.
 * Intercepts responses, sanitizes exceptions, and guards against information leaks in production.
 */
export function withApiErrorHandler(handler: NextApiHandlerWithErrors) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		const timestamp = new Date().toISOString();
		const route = req.url || "unknown";
		const method = req.method || "unknown";
		const isProduction = process.env.NODE_ENV === "production";

		// Intercept res.status and res.json to format/sanitize responses
		const originalStatus = res.status;
		const originalJson = res.json;
		let currentStatusCode = 200;

		res.status = function (statusCode: number) {
			currentStatusCode = statusCode;
			return originalStatus.call(this, statusCode);
		};

		res.json = function (payload: any) {
			if (currentStatusCode >= 400) {
				// Log the error internally on the server
				console.error(`[API ERROR RESPONSE] [${timestamp}] [${method} ${route}] Status: ${currentStatusCode}`, payload);

				let code = "INTERNAL_SERVER_ERROR";
				let message = "Something went wrong.";

				const handlerMessage = payload?.message || (typeof payload?.error === "string" ? payload.error : null);

				if (currentStatusCode === 400) {
					code = "BAD_REQUEST";
					// Preserve safe, explicit 400 messages written by route handlers
					message = handlerMessage || "Invalid request parameters.";
				} else if (currentStatusCode === 401) {
					code = "UNAUTHORIZED";
					message = handlerMessage || "Authentication is required.";
				} else if (currentStatusCode === 403) {
					code = "FORBIDDEN";
					message = handlerMessage || "You do not have permission to perform this action.";
				} else if (currentStatusCode === 404) {
					code = "NOT_FOUND";
					message = handlerMessage || "The requested resource was not found.";
				} else if (currentStatusCode === 405) {
					code = "METHOD_NOT_ALLOWED";
					message = handlerMessage || "HTTP method not allowed.";
				} else if (currentStatusCode === 503) {
					code = "SERVICE_UNAVAILABLE";
					message = handlerMessage || "Service is temporarily unavailable.";
				} else if (currentStatusCode === 200) {
					// Success responses pass through unchanged
					return originalJson.call(this, payload);
				}

				const resolvedMessage = currentStatusCode >= 500
					? message
					: (handlerMessage || message);

				const sanitizedPayload = {
					success: false,
					message: resolvedMessage,
					error: {
						code,
						message: resolvedMessage,
						...(isProduction ? {} : { details: payload }),
					},
				};

				return originalJson.call(this, sanitizedPayload);
			}

			return originalJson.call(this, payload);
		};

		try {
			await handler(req, res);
		} catch (error: any) {
			// Always log the full error server-side (never sent to client)
			console.error(`[API UNHANDLED CRASH] [${timestamp}] [${method} ${route}]`, error);

			if (!res.writableEnded) {
				// Classify Firebase / Google errors into a safe user message
				const safeFirebaseMsg = classifyFirebaseError(error);

				res.status(500).json({
					success: false,
					// In dev: show classifed or raw message; in prod: always generic
					message: isProduction
						? "Unable to process your request. Please try again later."
						: (safeFirebaseMsg ?? error?.message ?? "Internal Server Error"),
				});
			}
		}
	};
}
