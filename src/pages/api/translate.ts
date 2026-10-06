import { withApiErrorHandler } from "@/utils/apiErrorHandler";
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
	translatedText?: string;
	error?: string;
};

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { text, targetLang } = req.body;
	if (!text || !targetLang) {
		return res.status(400).json({ error: 'Missing required parameters' });
	}

	try {
		const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({ q: text }).toString(),
		});

		if (!response.ok) {
			throw new Error('Translation API request failed');
		}

		const data = await response.json();
		if (!data || !data[0]) {
			throw new Error('Invalid response structure from translation service');
		}

		const translatedText = data[0]
			.map((segment: any) => segment[0] || '')
			.join('');

		res.status(200).json({ translatedText });
	} catch (error: any) {
		console.error('Translation Error:', error);
		res.status(500).json({ error: error.message || 'Failed to translate' });
	}
}

export default withApiErrorHandler(handler);
