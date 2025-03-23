import { Mistral } from "@mistralai/mistralai";

if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is not set in environment variables");
}

const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
});

export async function GET() {
    try {
        const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('Error fetching models:', error);
        return Response.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const response = await mistral.chat.complete({
            model: "mistral-small-latest",
            messages: messages,
        });

        return Response.json({
            response: response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content
        });
    } catch (error) {
        console.error('Error in chat:', error);
        return Response.json({ error: 'Failed to process chat request' }, { status: 500 });
    }
}