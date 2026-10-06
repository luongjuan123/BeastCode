import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
	apiVersion: "2023-10-16" as any,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { amount, currency = "usd" } = req.body;

		if (!amount || amount <= 0) {
			return res.status(400).json({ error: "Invalid amount" });
		}

		const secretKey = process.env.STRIPE_SECRET_KEY;
		if (!secretKey) {
			return res.status(400).json({
				error: "STRIPE_SECRET_KEY is not configured in .env.local. Please add your Stripe API keys to process real credit card payments.",
				missingKeys: true,
			});
		}

		const stripe = new Stripe(secretKey, {
			apiVersion: "2023-10-16" as any,
		});

		// Create a PaymentIntent with the specified amount and currency
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(amount * 100), // Stripe expects amounts in cents
			currency,
			automatic_payment_methods: {
				enabled: true,
			},
		});

		res.status(200).json({
			clientSecret: paymentIntent.client_secret,
		});
	} catch (error: any) {
		console.error("Error creating payment intent:", error);
		res.status(500).json({ error: error.message || "Internal Server Error" });
	}
}

export default withApiErrorHandler(handler);
