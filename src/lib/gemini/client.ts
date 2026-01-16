import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateResponse(
  systemPrompt: string,
  userMessage: string,
  context: string
): Promise<string> {
  const prompt = `${systemPrompt}

## Store Data Context
${context}

## User Question
${userMessage}

## Instructions
Answer the user's question using the data provided. Be specific with numbers and percentages. Keep your response concise but informative. If the data doesn't fully answer the question, explain what you can determine and what additional information would help.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "No response generated";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate response");
  }
}

export async function generateReport(
  reportType: string,
  data: string,
  storeName: string
): Promise<string> {
  const prompt = `Generate a ${reportType} report for the Shopify store "${storeName}".

## Data
${data}

## Instructions
Analyze the data and provide:
1. Key metrics and insights
2. Trends and patterns
3. Actionable recommendations

Format your response as a structured report with clear sections. Use specific numbers and percentages. Keep it professional but easy to understand.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "No report generated";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate report");
  }
}
