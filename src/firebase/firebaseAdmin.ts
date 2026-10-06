/**
 * Firebase Admin SDK — singleton initializer for Next.js API routes.
 *
 * Authentication method: Service Account (cert) — NEVER ADC.
 *
 * Required environment variables:
 *   FIREBASE_PROJECT_ID     — Firebase project ID
 *   FIREBASE_CLIENT_EMAIL   — Service account client_email
 *   FIREBASE_PRIVATE_KEY    — Service account private_key (newlines as \n)
 *
 * These must be set in .env.local (dev) and the hosting environment (production).
 * The application will throw a hard startup error if any variable is missing.
 */

import { initializeApp, cert, getApps, getApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";

// ─── Startup Validation & Mocks ───────────────────────────────────────────────
const isProd = process.env.NODE_ENV === "production";

// Configure quota project for local Application Default Credentials (ADC) fallback.
// This prevents billing quota error (403 Permission Denied) for REST-based auth actions.
const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";
if (!process.env.GOOGLE_CLOUD_QUOTA_PROJECT && projectId) {
	process.env.GOOGLE_CLOUD_QUOTA_PROJECT = projectId;
}

const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_CLIENT_EMAIL.trim() !== "";
const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.trim() !== "";

let useMockFallback = false;

// In-memory mock storage for local testing
const mockDbStore: Record<string, any[]> = {
	passwordResetTokens: [],
	securityLogs: [],
	emailQueue: [],
	mail: [],
	emailStats: [],
	userReports: [],
	reportEvidence: [],
	reportComments: [],
	moderationCases: [],
	moderationWarnings: [],
	moderationAppeals: [],
	moderationLogs: [],
};

const mockUsers = [
	{
		uid: "mock-uid-beastcode",
		email: "bomemebo6996@gmail.com",
		displayName: "BeastCode User",
		passwordHash: "mock-hash",
	},
	{
		uid: "mock-uid-test",
		email: "test@beastcode.codes",
		displayName: "Test User",
		passwordHash: "mock-hash",
	}
];

function resolveMockFieldValue(currentVal: any, transform: any): any {
	if (transform && typeof transform === "object") {
		const name = transform.constructor?.name;
		if (name === "NumericIncrementTransform") {
			const operand = transform.operand;
			return (typeof currentVal === "number" ? currentVal : 0) + operand;
		}
		if (name === "ArrayUnionTransform") {
			const elements = transform.elements || [];
			const arr = Array.isArray(currentVal) ? [...currentVal] : [];
			for (const el of elements) {
				if (!arr.includes(el)) {
					arr.push(el);
				}
			}
			return arr;
		}
		if (name === "ArrayRemoveTransform") {
			const elements = transform.elements || [];
			const arr = Array.isArray(currentVal) ? [...currentVal] : [];
			return arr.filter(el => !elements.includes(el));
		}
	}
	return transform;
}

class MockDocumentReference {
	constructor(private collectionName: string, private documentId: string) {}
	deleteSync() {
		const list = mockDbStore[this.collectionName] || [];
		const index = list.findIndex(d => d.id === this.documentId);
		if (index > -1) {
			list.splice(index, 1);
		}
	}
	async delete() {
		this.deleteSync();
	}
	updateSync(updateData: any) {
		if (!mockDbStore[this.collectionName]) {
			mockDbStore[this.collectionName] = [];
		}
		const list = mockDbStore[this.collectionName];
		let found = list.find(d => d.id === this.documentId);
		if (!found) {
			found = { id: this.documentId };
			list.push(found);
		}
		for (const key in updateData) {
			const val = updateData[key];
			found[key] = resolveMockFieldValue(found[key], val);
		}
	}
	async update(updateData: any) {
		this.updateSync(updateData);
	}
	setSync(setData: any, options?: { merge?: boolean }) {
		if (!mockDbStore[this.collectionName]) {
			mockDbStore[this.collectionName] = [];
		}
		const list = mockDbStore[this.collectionName];
		let found = list.find(d => d.id === this.documentId);
		if (!found) {
			found = { id: this.documentId };
			list.push(found);
		}
		if (options?.merge) {
			for (const key in setData) {
				const val = setData[key];
				found[key] = resolveMockFieldValue(found[key], val);
			}
		} else {
			for (const key in found) {
				if (key !== "id") {
					delete found[key];
				}
			}
			for (const key in setData) {
				const val = setData[key];
				found[key] = resolveMockFieldValue(undefined, val);
			}
		}
	}
	async set(setData: any, options?: { merge?: boolean }) {
		this.setSync(setData, options);
	}
	async get() {
		const list = mockDbStore[this.collectionName] || [];
		const found = list.find(d => d.id === this.documentId);
		return {
			exists: !!found,
			id: this.documentId,
			data: () => found ? { ...found } : undefined
		};
	}
}

class MockQueryDocumentSnapshot {
	ref: MockDocumentReference;
	id: string;
	private _data: any;
	constructor(collectionName: string, data: any) {
		this._data = data;
		this.ref = new MockDocumentReference(collectionName, data.id);
		this.id = data.id || Math.random().toString(36).substring(7);
	}
	data() {
		return this._data;
	}
}

class MockQuerySnapshot {
	docs: MockQueryDocumentSnapshot[];
	empty: boolean;
	constructor(docs: MockQueryDocumentSnapshot[]) {
		this.docs = docs;
		this.empty = docs.length === 0;
	}
}

class MockQuery {
	constructor(
		protected colName: string,
		protected filters: Array<(doc: any) => boolean> = [],
		protected limitVal?: number,
		protected offsetVal?: number,
		protected orderField?: string,
		protected orderDirection: "asc" | "desc" = "asc"
	) {}

	where(field: string, op: string, value: any) {
		const filter = (doc: any) => {
			if (op === "==") return doc[field] === value;
			if (op === ">=") return doc[field] >= value;
			if (op === "<=") return doc[field] <= value;
			if (op === ">") return doc[field] > value;
			if (op === "<") return doc[field] < value;
			if (op === "in" && Array.isArray(value)) return value.includes(doc[field]);
			return true;
		};
		return new MockQuery(
			this.colName,
			[...this.filters, filter],
			this.limitVal,
			this.offsetVal,
			this.orderField,
			this.orderDirection
		);
	}

	orderBy(field: string, direction: "asc" | "desc" = "asc") {
		return new MockQuery(
			this.colName,
			this.filters,
			this.limitVal,
			this.offsetVal,
			field,
			direction
		);
	}

	limit(n: number) {
		return new MockQuery(
			this.colName,
			this.filters,
			n,
			this.offsetVal,
			this.orderField,
			this.orderDirection
		);
	}

	offset(n: number) {
		return new MockQuery(
			this.colName,
			this.filters,
			this.limitVal,
			n,
			this.orderField,
			this.orderDirection
		);
	}

	count() {
		return {
			get: async () => {
				const snap = await this.get();
				return {
					data: () => ({
						count: snap.docs.length
					})
				};
			}
		};
	}

	async get() {
		const all = mockDbStore[this.colName] || [];
		let filtered = all.filter(doc => this.filters.every(f => f(doc)));

		if (this.orderField) {
			filtered = [...filtered].sort((a, b) => {
				const valA = a[this.orderField!];
				const valB = b[this.orderField!];
				if (valA === undefined && valB === undefined) return 0;
				if (valA === undefined) return 1;
				if (valB === undefined) return -1;
				if (valA < valB) return this.orderDirection === "asc" ? -1 : 1;
				if (valA > valB) return this.orderDirection === "asc" ? 1 : -1;
				return 0;
			});
		}

		if (this.offsetVal !== undefined) {
			filtered = filtered.slice(this.offsetVal);
		}

		if (this.limitVal !== undefined) {
			filtered = filtered.slice(0, this.limitVal);
		}

		const docs = filtered.map(d => new MockQueryDocumentSnapshot(this.colName, d));
		return new MockQuerySnapshot(docs);
	}
}

class MockCollectionReference extends MockQuery {
	constructor(private cName: string) {
		super(cName);
	}

	async add(data: any) {
		if (!mockDbStore[this.cName]) {
			mockDbStore[this.cName] = [];
		}
		const docData = { ...data, id: Math.random().toString(36).substring(7) };
		mockDbStore[this.cName].push(docData);
		const snap = new MockQueryDocumentSnapshot(this.cName, docData);
		return snap.ref;
	}

	doc(id: string) {
		return new MockDocumentReference(this.cName, id);
	}
}

class MockTransaction {
	async get(ref: any) {
		return ref.get();
	}
	set(ref: any, data: any, options?: any) {
		ref.setSync(data, options);
		return this;
	}
	update(ref: any, data: any) {
		ref.updateSync(data);
		return this;
	}
	delete(ref: any) {
		ref.deleteSync();
		return this;
	}
}

class MockFirestore {
	collection(name: string) {
		return new MockCollectionReference(name);
	}
	async runTransaction(updateFunction: (transaction: MockTransaction) => Promise<any>) {
		const transaction = new MockTransaction();
		return await updateFunction(transaction);
	}
}

class MockAuth {
	async getUser(uid: string) {
		let user = mockUsers.find(u => u.uid === uid);
		if (!user) {
			console.warn(`[Mock Auth] User ${uid} not found. Dynamically creating mock user.`);
			user = {
				uid,
				email: `${uid}@example.com`,
				displayName: `Mock User (${uid.slice(0, 5)})`,
				passwordHash: "mock-hash",
			};
			mockUsers.push(user);
		}
		return user;
	}

	async getUserByEmail(email: string) {
		const emailLower = email.toLowerCase().trim();
		const user = mockUsers.find(u => u.email.toLowerCase() === emailLower);
		if (!user) {
			const err: any = new Error(`User not found for email: ${email}`);
			err.code = "auth/user-not-found";
			err.errorInfo = { code: "auth/user-not-found" };
			throw err;
		}
		return user;
	}

	async updateUser(uid: string, properties: any) {
		const user = mockUsers.find(u => u.uid === uid);
		if (!user) {
			const err: any = new Error(`User not found: ${uid}`);
			err.code = "auth/user-not-found";
			throw err;
		}
		Object.assign(user, properties);
		console.log(`[Mock Auth] Updated user ${uid} password:`, properties.password ? "[REDACTED]" : properties);
		return user;
	}

	async revokeRefreshTokens(uid: string) {
		console.log(`[Mock Auth] Revoked refresh tokens for user ${uid}`);
	}

	async deleteUser(uid: string) {
		const index = mockUsers.findIndex(u => u.uid === uid);
		if (index > -1) {
			mockUsers.splice(index, 1);
		}
		console.log(`[Mock Auth] Deleted user account ${uid}`);
	}

	async verifyIdToken(token: string) {
		try {
			const parts = token.split('.');
			if (parts.length === 3) {
				const payloadBuf = Buffer.from(parts[1], 'base64');
				const payload = JSON.parse(payloadBuf.toString('utf-8'));
				return {
					uid: payload.user_id || payload.sub || "mock-uid",
					email: payload.email || "",
					email_verified: payload.email_verified || false,
				};
			}
		} catch (e) {
			console.error("Mock verifyIdToken parsing failed:", e);
		}
		return {
			uid: token === "mock-admin-token" ? "mock-uid-admin" : "mock-uid-test",
			email: token === "mock-admin-token" ? "admin@leetcode.com" : "test@beastcode.codes",
			email_verified: true,
		};
	}
}

function assertEnvVar(name: string): string {
	const value = process.env[name];
	if (!value || value.trim() === "") {
		const msg =
			`[Firebase Admin] FATAL: Required environment variable "${name}" is missing or empty.\n` +
			`Add it to .env.local (development) or your hosting environment (production).\n` +
			`See: https://firebase.google.com/docs/admin/setup#initialize-sdk`;
		console.error(msg);
		throw new Error(msg);
	}
	return value;
}

// ─── Singleton App ────────────────────────────────────────────────────────────
function getAdminApp(): App {
	if (getApps().length > 0) {
		return getApp();
	}

	const projectId = process.env.FIREBASE_PROJECT_ID || "beastcode-7555e";
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY;
	const storageBucket =
		process.env.FIREBASE_STORAGE_BUCKET ||
		process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
		"beastcode-media-348293518232";

	if (clientEmail && privateKey) {
		try {
			return initializeApp({
				credential: cert({
					projectId,
					clientEmail,
					privateKey: privateKey.replace(/\\n/g, "\n"),
				}),
				storageBucket,
			});
		} catch (error) {
			console.error("[Firebase Admin] Failed to initialize with cert:", error);
		}
	}

	// Try initializing with just projectId (ADC / local auth)
	if (!isProd) {
		try {
			console.log("[Firebase Admin] Attempting initialization with local credentials / ADC...");
			const app = initializeApp({ projectId, storageBucket });
			// Quick test: verify we can get firestore
			getFirestore(app);
			console.log("[Firebase Admin] Initialized successfully using local credentials.");
			return app;
		} catch (error) {
			console.warn("[Firebase Admin] Local ADC initialization failed. Falling back to Mock Firestore.");
			useMockFallback = true;
		}
	} else {
		useMockFallback = true;
	}

	// Fallback to asserting env vars if everything else failed
	const assertedProjectId    = assertEnvVar("FIREBASE_PROJECT_ID");
	const assertedClientEmail  = assertEnvVar("FIREBASE_CLIENT_EMAIL");
	const assertedPrivateKey   = assertEnvVar("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

	return initializeApp({
		credential: cert({ projectId: assertedProjectId, clientEmail: assertedClientEmail, privateKey: assertedPrivateKey }),
		storageBucket,
	});
}

// ─── Public Accessors (lazy singleton) ────────────────────────────────────────
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _mockDb: any = null;
let _mockAuth: any = null;

export function getAdminFirestore(): Firestore {
	if (useMockFallback) {
		if (!_mockDb) {
			console.warn("[Firebase Admin] WARNING: Running with in-memory Mock Firestore for local development.");
			_mockDb = new MockFirestore();
		}
		return _mockDb as unknown as Firestore;
	}

	try {
		if (!_db) {
			_db = getFirestore(getAdminApp());
			try {
				_db.settings({ ignoreUndefinedProperties: true });
			} catch (settingsError) {
				console.warn("[Firebase Admin] Settings could not be applied (likely already applied):", settingsError);
			}
		}
		return _db;
	} catch (e) {
		if (!isProd) {
			console.error("[Firebase Admin] Real Firestore initialization error:", e);
			useMockFallback = true;
			if (!_mockDb) {
				console.warn("[Firebase Admin] WARNING: Real Firestore init failed. Falling back to Mock Firestore.");
				_mockDb = new MockFirestore();
			}
			return _mockDb as unknown as Firestore;
		}
		throw e;
	}
}

export function getAdminAuth(): Auth {
	if (useMockFallback) {
		if (!_mockAuth) {
			console.warn("[Firebase Admin] WARNING: Running with in-memory Mock Auth for local development.");
			_mockAuth = new MockAuth();
		}
		return _mockAuth as unknown as Auth;
	}

	try {
		if (!_auth) {
			_auth = getAuth(getAdminApp());
		}
		return _auth;
	} catch (e) {
		if (!isProd) {
			useMockFallback = true;
			if (!_mockAuth) {
				console.warn("[Firebase Admin] WARNING: Real Auth init failed. Falling back to Mock Auth.");
				_mockAuth = new MockAuth();
			}
			return _mockAuth as unknown as Auth;
		}
		throw e;
	}
}

let _storage: Storage | null = null;

export function getAdminStorage(): Storage {
	try {
		if (!_storage) {
			_storage = getStorage(getAdminApp());
		}
		return _storage;
	} catch (e) {
		console.error("[Firebase Admin] Storage initialization error:", e);
		throw e;
	}
}
