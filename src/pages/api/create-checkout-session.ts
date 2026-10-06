import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey
	? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" as any })
	: null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method Not Allowed" });
	}

	try {
		const { amount, currency = "usd", cancelUrl, successUrl } = req.body;

		if (!amount || Number(amount) <= 0) {
			return res.status(400).json({ error: "Invalid donation amount" });
		}

		if (!stripe) {
			return res.status(400).json({
				error: "Stripe API keys are missing. Please add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file to enable live card payments.",
				missingKeys: true,
			});
		}

		const appOrigin =
			req.headers.origin ||
			process.env.NEXT_PUBLIC_SITE_URL ||
			"https://www.bomboclatbeastcode.codes";

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: currency.toLowerCase(),
						product_data: {
							name: "Support BeastCode Platform",
							description: "Donation to support BeastCode servers, contests, and infrastructure.",
							images: [`${appOrigin}/logo.png`],
						},
						unit_amount: Math.round(Number(amount) * 100),
					},
					quantity: 1,
				},
			],
			mode: "payment",
			success_url: successUrl || `${appOrigin}/qr?status=success&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: cancelUrl || `${appOrigin}/qr?status=cancelled`,
		});

		return res.status(200).json({
			success: true,
			url: session.url,
			sessionId: session.id,
		});
	} catch (error: any) {
		console.error("[Stripe Checkout Session Error]:", error);
		return res.status(500).json({ error: error.message || "Failed to create checkout session" });
	}
}

export default withApiErrorHandler(handler);
