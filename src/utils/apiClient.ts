import { auth } from "@/firebase/firebase";

export interface ApiClientOptions extends RequestInit {
	timeout?: number;
}

export class ApiError extends Error {
	status: number;
	code: string;
	details?: any;

	constructor(message: string, status: number, code: string, details?: any) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

const nativeFetch = typeof window !== "undefined"
	? (window as any).__originalFetch || window.fetch
	: fetch;

export const apiClient = {
	async request<T = any>(url: string, options: ApiClientOptions = {}): Promise<T> {
		const { timeout = 15000, headers: customHeaders, ...restOptions } = options;

		// Get Firebase Auth token if user is signed in
		let token: string | null = null;
		if (auth.currentUser) {
			try {
				token = await auth.currentUser.getIdToken();
			} catch (tokenErr) {
				console.error("[ApiClient] Failed to get Auth token:", tokenErr);
			}
		}

		// Build headers
		const headers = new Headers(customHeaders);
		headers.set("x-api-client", "true"); // Prevent interceptor recursion loops

		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		if (!headers.has("Accept")) {
			headers.set("Accept", "application/json");
		}
		if (!headers.has("Content-Type") && restOptions.body) {
			headers.set("Content-Type", "application/json");
		}

		// Set up timeout controller
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			console.log(`[ApiClient Request] [${restOptions.method || "GET"}] ${url}`);
			
			const response = await nativeFetch(url, {
				...restOptions,
				headers,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Verify content type is JSON before parsing
			const contentType = response.headers.get("Content-Type") || "";
			const isJson = contentType.includes("application/json");

			let body: any = null;
			if (isJson) {
				body = await response.json();
			} else {
				const text = await response.text();
				console.error(`[ApiClient Error] Expected JSON but got Content-Type: ${contentType}. Status: ${response.status}. Body preview: ${text.substring(0, 200)}`);
				
				const errMessage = response.status === 404
					? "API route not found. Please contact support."
					: response.status === 500
					? "Internal server error. Please try again later."
					: `Server error (${response.status}). Expected JSON response.`;
				
				throw new ApiError(errMessage, response.status, "NON_JSON_RESPONSE", { text });
			}

			// Handle non-ok status codes (e.g. 400, 401, 403, 404, 500)
			if (!response.ok || (body && body.success === false)) {
				const errMsg = body?.error?.message || body?.message || body?.error || `Request failed with status ${response.status}`;
				const errCode = body?.error?.code || body?.code || "REQUEST_FAILED";
				
				console.error(`[ApiClient Error Response] Status: ${response.status}, Code: ${errCode}, Message: ${errMsg}`);
				
				throw new ApiError(errMsg, response.status, errCode, body?.error?.details || body);
			}

			return body as T;
		} catch (error: any) {
			clearTimeout(timeoutId);
			if (error instanceof ApiError) {
				throw error;
			}

			let friendlyMessage = "Network error. Please check your internet connection.";
			let code = "NETWORK_ERROR";

			if (error.name === "AbortError") {
				friendlyMessage = "Request timed out. Please try again.";
				code = "TIMEOUT";
			}

			console.error(`[ApiClient Connection Error] ${error.message}`, error);
			throw new ApiError(friendlyMessage, 0, code, error);
		}
	},

	async get<T = any>(url: string, options?: ApiClientOptions): Promise<T> {
		return this.request<T>(url, { ...options, method: "GET" });
	},

	async post<T = any>(url: string, body?: any, options?: ApiClientOptions): Promise<T> {
		return this.request<T>(url, {
			...options,
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		});
	},

	async patch<T = any>(url: string, body?: any, options?: ApiClientOptions): Promise<T> {
		return this.request<T>(url, {
			...options,
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
		});
	},

	async delete<T = any>(url: string, body?: any, options?: ApiClientOptions): Promise<T> {
		return this.request<T>(url, {
			...options,
			method: "DELETE",
			body: body ? JSON.stringify(body) : undefined,
		});
	},
};
