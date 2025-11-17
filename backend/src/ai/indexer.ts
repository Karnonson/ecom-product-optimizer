import { devLocalIndexerRef, devLocalVectorstore } from '@genkit-ai/dev-local-vectorstore';
import { googleAI } from '@genkit-ai/google-genai';
import { z, genkit } from 'genkit';
import { Document } from 'genkit/retriever';
import { chunk } from 'llm-chunk';
import { readFile } from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const ai = genkit({
  plugins: [
    // googleAI provides the gemini-embedding-001 embedder
    googleAI(),

    // the local vector store requires an embedder to translate from text to vector
    devLocalVectorstore([
      {
        indexName: 'guidelinesQA',
        embedder: googleAI.embedder('gemini-embedding-001'),
      },
    ]),
  ],
});

//***********************************Config end */

//Create index
export const guidelinesPdfIndexer = devLocalIndexerRef('guidelinesQA');

// chunking config
const chunkingConfig = {
  minLength: 1000,
  maxLength: 2000,
  splitter: 'sentence',
  overlap: 100,
  delimiters: '',
} as any;

// Extract pdf content

async function extractTextFromPdf(filePath: string) {
  const pdfFile = path.resolve(filePath);
  const dataBuffer = await readFile(pdfFile);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// Define indexer flow 
export const indexGuideLines = ai.defineFlow(
  {
    name: 'indexGuideLines',
    inputSchema: z.object({
      filePath: z.string().describe('PDF file path'),
      // optional fileType allows distinguishing between examples / include / avoid etc.
      fileType: z.string().optional().describe('Optional type of file (examples, include, avoid, ...)'),
      fileName: z.string().optional().describe('Original filename (optional)')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      documentsIndexed: z.number(),
      error: z.string().optional(),
    }),
  },
  async ({ filePath, fileType, fileName }) => {
    try {
      filePath = path.resolve(filePath);

      // Read the pdf
      const pdfTxt = await ai.run('extract-text', () => extractTextFromPdf(filePath));

      // Divide the pdf text into segments
      const chunks = await ai.run('chunk-it', async () => chunk(pdfTxt, chunkingConfig));

      // Convert chunks of text into documents to store in the index.
      const documents = chunks.map((text, idx) => {
        // attach useful metadata so we can filter/delete by file later
        const meta = {
          filePath,
          fileName: fileName ?? path.basename(filePath),
          fileType: fileType ?? 'unknown',
          chunkIndex: idx,
        } as any;

        return Document.fromText(text, meta);
      });

      // Add documents to the index
      await ai.index({
        indexer: guidelinesPdfIndexer,
        documents,
      });

      return {
        success: true,
        documentsIndexed: documents.length,
      };
    } catch (err) {
      // For unexpected errors that throw exceptions
      return {
        success: false,
        documentsIndexed: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
);

// Flow to delete all indexed documents related to a given file path or filename
export const deleteIndexedFile = ai.defineFlow(
  {
    name: 'deleteIndexedFile',
    inputSchema: z.object({
      // prefer full resolved path, but accept filename as fallback
      filePath: z.string().optional(),
      fileName: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), message: z.string().optional() }),
  },
  async ({ filePath, fileName }) => {
    try {
      // Resolve filePath if provided
      const resolved = filePath ? path.resolve(filePath) : undefined;

      // The dev-local-vectorstore plugin exposes index management on the runtime.
      // Different plugin/runtime versions may provide different method names. We'll
      // attempt common removal APIs via the genkit runtime object in a best-effort
      // manner and catch failures without preventing file deletion.

      // 1) Try a dedicated unindex / delete API if available
      try {
        if ((ai as any).unindex) {
          await (ai as any).unindex({ indexer: guidelinesPdfIndexer, filter: { filePath: resolved, fileName } });
          return { success: true, message: 'Deleted via ai.unindex' };
        }

        // 2) Some runtimes expose a delete API on the indexer reference
        if ((guidelinesPdfIndexer as any).delete) {
          await (guidelinesPdfIndexer as any).delete({ filter: { filePath: resolved, fileName } });
          return { success: true, message: 'Deleted via indexer.delete' };
        }

        // 3) As a last resort, try calling a generic admin/index API if present
        if ((ai as any).admin && (ai as any).admin.delete) {
          await (ai as any).admin.delete({ indexName: 'guidelinesQA', filter: { filePath: resolved, fileName } });
          return { success: true, message: 'Deleted via ai.admin.delete' };
        }
      } catch (innerErr) {
        // If plugin API throws, log and continue to fallback
        console.warn('Warning while attempting to delete from vectorstore:', innerErr);
      }

      // If none of the above APIs were available, return success:false but do not throw.
      return { success: false, message: 'No deletion API available on runtime; index entries may remain.' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
);




// (async () => {
//   const res = await indexGuideLines({filePath: "src/files/plan-dev.pdf"});
//   console.log(res);
// })(); 
