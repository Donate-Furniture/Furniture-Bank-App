import { NextResponse, NextRequest } from 'next/server';

// Note: In the Canvas environment, the API key is handled automatically if left empty.
const apiKey = ""; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// Helper function to fetch a remote image URL and convert it to Base64
async function urlToBase64(url: string): Promise<{ base64: string, mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { base64, mimeType: contentType };
}

// Helper for Exponential Backoff (standard practice for API calls)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Main API Handler
export async function POST(request: NextRequest) {
    try {
        const { receiptUrl } = await request.json();
        
        // Use the first receipt only, or return error if none is provided
        const targetUrl = Array.isArray(receiptUrl) && receiptUrl.length > 0 ? receiptUrl[0] : null;

        if (!targetUrl) {
            return NextResponse.json({ error: 'No receipt URL provided for analysis.' }, { status: 400 });
        }

        // Fetch image and convert
        const { base64, mimeType } = await urlToBase64(targetUrl);

        const prompt = "Analyze this receipt image. Find the single total amount paid (including tax and fees). Ignore partial totals. Return only the final total price as a number, or null if no price is clearly visible.";

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64
                        }
                    }
                ]
            }],
            generationConfig: {
                // Force JSON output
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "totalPrice": { "type": "NUMBER", description: "The final total price found on the receipt." }
                    }
                }
            }
        };

        let jsonResult: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`API call failed with status ${response.status}`);

                const result = await response.json();
                
                // Parse the JSON string response from the model
                const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!responseText) throw new Error("Model response was empty.");
                
                jsonResult = JSON.parse(responseText);
                break; // Success
            } catch (e) {
                console.warn(`Attempt ${attempts + 1} failed. Retrying...`, e);
                attempts++;
                if (attempts < maxAttempts) {
                    await delay(2 ** attempts * 1000); // Exponential backoff
                } else {
                    throw new Error("Failed to get a valid response from Gemini API after multiple retries.");
                }
            }
        }

        if (jsonResult && typeof jsonResult.totalPrice === 'number' && jsonResult.totalPrice !== null) {
            return NextResponse.json({ price: jsonResult.totalPrice }, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Could not reliably extract a total price from the document.' }, { status: 404 });
        }
        
    } catch (error: any) {
        console.error('OCR Process Error:', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred during OCR processing.' }, { status: 500 });
    }
}