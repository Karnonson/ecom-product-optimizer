import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { devLocalRetrieverRef, devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';
import dotenv from 'dotenv';
dotenv.config();

// --- Initialize Genkit with Google AI and local retriever plugin
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    devLocalVectorstore([
      {
        indexName: 'guidelinesQA',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
    ]),
  ],
});

// --- Define input/output schemas
const ProductDetailsInputSchema = z.object({
  customerReviews: z.string().describe('CSV data of customer reviews').optional(),
  userInstructions: z.string().describe('User instructions for generating product details'),
  productTitle: z.string().describe('The current title of the product'),
  productDescription: z
    .string()
    .describe('The current description of the product'),
  category: z.string().describe('The product category'),
  language: z.string().describe("Language in which the description should be generated").optional().default('English'),
  sku: z.string().describe('The product Stock Keeping Unit (SKU)').optional(),
});

const ProductDetailsOutputSchema = z.object({
  newTitle: z.string().describe('A new, optimized product title'),
  newDescription: z.string().describe('A new, optimized product description'),
  justifications: z.string().describe("Justification of the new description."),
  positiveSummary: z.string().describe('Summary of positive reviews').optional(),
  negativeSummary: z.string().describe('Summary of negative reviews').optional(),
  recommendations: z.string().describe('Actionable recommendations based on reviews').optional(),
});

// --- Define retriever reference
export const guidelinesRetriever = devLocalRetrieverRef('guidelinesQA');

// --- Define the flow
export const optimizeProductDetails = ai.defineFlow(
  {
    name: 'optimizeProductDetails',
    inputSchema: ProductDetailsInputSchema,
    outputSchema: ProductDetailsOutputSchema,
  },
  async (input) => {
    try {
      // 1️ Retrieve context from guidelinesRetriever
      const docs = await ai.retrieve({
        retriever: guidelinesRetriever,
        query: `
          Product: ${input.productTitle}
          Category: ${input.category}
          Instructions: ${input.userInstructions}
          Exclusion: "what words should be exclude in the description and title? Find the file with the fileType exclusion or avoid"
        `,
        options: { k: 10 },
      });

      // 2️ Generate product details using retrieved docs
      const { text } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        docs,
        config: {
    temperature: 0.8,
  },
        prompt: `
- Instructions: ${input.userInstructions}
`,
       system: `

You will be provided with the following information:

1.  ** Retrieved Context **: Contains mandatory company guidelines, style examples, and lists of allowed or disallowed words/phrases.
2.  ** Product Data **: Contains the existing product title, description, and feature list.
3.  ** Customer Reviews  (Optional)**: A list of customer reviews, which may include user ID, date, rating, and review text.

### Retrieved Context
${docs.map((d) => d.content).join('\n\n')}

### Product Data
- Title: ${input.productTitle}
- Category: ${input.category}
- Language: ${input.language}
- SKU: ${input.sku}
### Customer Reviews
- Reviews: ${input.customerReviews || 'No reviews provided.'}

### Role & Persona

You are an expert e-commerce copywriter and optimization specialist.
Your tone is informative, honest, and helpful, not overly "salesy" or pushy.

### Primary Task

Based *only* on the provided  Retrieved Context ,  Product Data , and (if available)  Customer Reviews , generate a single, valid JSON object that optimizes the product's marketing copy and provides an analysis.
**Your justification language should be the same as your new description’s language.**
**Always follow the format of the description provided in the context to write yours** 
**Pay close attention to words to exclude in the descriptions and titles.**

### Conditional Logic

  * **If  Customer Reviews  ARE provided:** You must complete **all** fields in the JSON response. Use the reviews to inform the new title/description, address concerns, and generate summaries and recommendations.
  * **If  Customer Reviews  ARE NOT provided:** You must generate the  newTitle ,  newDescription , and  justifications . The  positiveSummary ,  negativeSummary , and  recommendations  fields **must be empty strings ( "" )**.

### Output Field Definitions

Your JSON response must contain the following keys:

1.  ** newTitle **: A compelling, clear, and concise new product title. Product name should be **Capitalized, not all caps** properly and free of disallowed words.
2.  ** newDescription **: A persuasive and detailed new product description.
      * It must incorporate positive themes from reviews.
      * It must (where possible) address common concerns from negative reviews.
      * It must strictly follow the style, tone, and rules from the  Retrieved Context .
      * Add two line breaks between the first line (title) and the rest of the description.
3.  ** justifications **: A two-part explanation:
      * **Part 1 (Change Rationale):** Briefly explain the key changes made and why the new content is an improvement (e.g., "Aligned with company guidelines by removing [disallowed word]," "Incorporated key positive theme of 'ease of use' from reviews").
      * **Part 2 (Review Evidence):** If reviews were used, cite **3 to 5 specific customer reviews** that directly influenced the changes. Use the format:  "[CustomerID] ([Date]): '[Relevant review snippet]'." 
4.  ** positiveSummary **: A brief summary of the key positive themes and compliments from customer reviews.
5.  ** negativeSummary **: A brief summary of the key negative themes, common complaints, and concerns from customer reviews.
6.  ** recommendations **: Actionable recommendations for product improvement or marketing adjustments based on the  negativeSummary . If no constructive negative feedback exists, state:  "No actionable recommendations from reviews." 

### Core Rules

  * **Guidelines are Absolute:** You *must* prioritize the  Retrieved Context  (company guidelines) above all else. If a review suggestion or user instruction conflicts with a guideline, the guideline *always* wins.
  * **No Fabrication:** Do not invent information, features, or review details. Your response must be based *solely* on the provided data.
  * **No ALL CAPS:** Never generate an all-uppercase  newTitle  or  newDescription (except the first line (title) in the description).
  * **Traceability:** All justifications must be traceable to the provided input data.
  * **The new title should be arround 10 words max**
  * **The new description should be at least 50 words and max 120 words.**

### Response Format

Respond **only with a single**, valid JSON object. Each element inside the JSON object must be an string, **not an object**. Do not include any explanatory text, markdown formatting (like \ \ \ json), or code fences before or after the JSON.

{
  "newTitle": "string",
  "newDescription": "string",
  "justifications": "string",
  "positiveSummary": "string",
  "negativeSummary": "...",
  "recommendations": "..."
}
        `,
      });

      // 3️ Clean output in case of code fences and parse JSON safely
      const rawText = text.trim();
      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const output = JSON.parse(cleanedText);

      return output;
    } catch (err) {
      console.error('Error in optimizeProductDetails flow:', err);
      throw new Error('Failed to create product details.');
    }
  }
);
/*
// --- Run a test call
(async () => {
  try {
    const res = await optimizeProductDetails({
        productTitle: "The ultimate guide to safe AI app",
        productDescription: "The only guide you’ll need to build safe llm apps",
      userInstructions: "What are three sources of harm in llm?",
      category: "Digital guides"
    });
    console.log('Generated product details:', res);
  } catch (err) {
    console.error('Test run failed:', err);
  }
})();*/