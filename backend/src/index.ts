
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import dotenv from 'dotenv';
import { indexGuideLines, deleteIndexedFile } from './ai/indexer.js';
import { generateProductDetails } from './ai/generate.js';
import { optimizeProductDetails } from './ai/optimize.js';
import { getProductDetails } from './shopify/getProduct.js';
import { createProduct } from './shopify/createProduct.js';
import {updateProduct} from './shopify/updateProduct.js'


dotenv.config();
const app = express();
const port = process.env.PORT?? 3000;

// determine path to local vectorstore DB file (__db_guidelinesQA.json) relative to this file
// use import.meta.url to compute __dirname in ESM
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const localVectorDbPath = path.resolve(__dirname, '..', '__db_guidelinesQA.json');

// Ensure upload directory exists
const uploadDir = 'src/files/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for PDF uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, file.originalname),
});

const pdfFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};

const upload = multer({ storage, fileFilter: pdfFileFilter });

// Multer setup for CSV upload in memory
const csvUpload = multer({ storage: multer.memoryStorage() });

// Serve static files and parse JSON
app.use(express.static('public')); // For serving frontend files if needed. But don’t need it now sync we have a separate frontend.
app.use(express.json());

// Handle PDF uploads for indexing in the vector database
app.post('/upload', upload.single('pdfFile'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const filePath = req.file.path;

  try {
    // Allow the client to pass an optional fileType (examples/include/avoid/...)
    const fileType = typeof req.body.fileType === 'string' ? req.body.fileType : undefined;
    const result = await indexGuideLines({ filePath, fileType, fileName: req.file.originalname });
    if (result.success) {
      res.send(`File uploaded and indexed successfully. ${result.documentsIndexed} documents were created.`);
    } else {
      res.status(500).send(`Failed to index file: ${result.error}`);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('An unexpected error occurred during indexing.');
  }
});

// Handle generate product details with optional CSV
app.post('/generate', csvUpload.single('customerReviewsCSV'), async (req, res) => {
  try {
    const body = { ...req.body };

    if (req.file) {
      const csvString = req.file.buffer.toString('utf-8');
      // Parse CSV with PapaParse
      const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
      });

      // Combine all columns of each row into one string per row
      const allReviews = parsed.data
        .map((row: any) => Object.values(row).join(' '))
        .join('\n');

      body.customerReviews = allReviews;
      console.log(`Here’s the csv file date: ${allReviews}`) // just for Debugging 
    }

    const result = await generateProductDetails(body);
    res.json(result);
  } catch (error) {
    console.error('Error generating product details:', error);
    res.status(500).send('An unexpected error occurred during generation.');
  }
});

//Optimize endpoint

app.post('/optimize', csvUpload.single('customerReviewsCSV'), async (req, res) => {
  try {
    const body = { ...req.body };

    // If a CSV file was uploaded, parse it
    if (req.file) {
      const csvString = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      body.customerReviews = parsed.data.map((row: any) => Object.values(row).join(' ')).join('\n');
    }

    // Call the optimizer function
    const result = await optimizeProductDetails(body);

    res.json(result);
  } catch (error: any) {
    if (error?.issues) {
      // Zod validation error
      res.status(400).json({ errors: error.issues });
    } else {
      console.error('Error optimizing product details:', error);
      res.status(500).send('An unexpected error occurred during optimization.');
    }
  }
});

// --- Delete individual uploaded files ---
app.delete('/files/:filename', async (req, res) => {
  const { filename } = req.params;

  if (!filename) return res.status(400).send('Filename is required.');

  const safePath = path.join(uploadDir, path.basename(filename));

  try {
    if (!fs.existsSync(safePath)) {
      return res.status(404).send('File not found.');
    }

    // Attempt to remove indexed documents related to this file.
    try {
      const deleteRes = await deleteIndexedFile({ filePath: safePath, fileName: filename });
      if (!deleteRes.success) {
        console.warn('Index deletion returned non-success:', deleteRes.message);
      } else {
        console.log('Index deletion succeeded:', deleteRes.message);
      }
    } catch (err) {
      console.warn('Failed to delete index entries for file:', err);
      // continue with file deletion even if index deletion fails
    }

    // Fallback: if the runtime/plugin did not delete entries, try editing the
    // local vectorstore JSON file directly (__db_guidelinesQA.json). This file is
    // created by the dev-local-vectorstore plugin and maps ids -> {doc, embedding}.
    try {
      if (fs.existsSync(localVectorDbPath)) {
        const raw = await fs.promises.readFile(localVectorDbPath, 'utf-8');
        const dbJson = JSON.parse(raw || '{}');
        const keys = Object.keys(dbJson);
        let removed = 0;
        for (const k of keys) {
          const entry = dbJson[k];
          const meta = entry?.doc?.metadata;
          if (!meta) continue;

          // Compare either filePath or fileName
          const entryPath = meta.filePath ? path.resolve(meta.filePath) : undefined;
          const entryName = meta.fileName;

          if ((entryPath && entryPath === path.resolve(safePath)) || entryName === filename) {
            delete dbJson[k];
            removed++;
          }
        }

        if (removed > 0) {
          await fs.promises.writeFile(localVectorDbPath, JSON.stringify(dbJson, null, 2), 'utf-8');
          console.log(`Removed ${removed} entries from vector DB file: ${localVectorDbPath}`);
        } else {
          console.log(`No matching entries found in vector DB for ${filename}`);
        }
      } else {
        console.log('Local vector DB file not found at', localVectorDbPath);
      }
    } catch (err) {
      console.warn('Error while attempting to edit local vector DB file:', err);
      // Do not fail deletion because of this
    }

    await fs.promises.unlink(safePath);
    res.send(`File "${filename}" deleted successfully.`);
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send('An unexpected error occurred while deleting the file.');
  }
});

// Display files to the frontend

// Serve uploaded files statically at /uploads
app.use('/uploads', express.static(uploadDir));

// List uploaded files for frontend
app.get('/files', async (_req, res) => {
  try {
    const files = await fs.promises.readdir(uploadDir);

    // Build a lookup of fileName -> fileType from local vector DB, if available
    let fileTypeByName: Record<string, string> = {};
    try {
      if (fs.existsSync(localVectorDbPath)) {
        const raw = await fs.promises.readFile(localVectorDbPath, 'utf-8');
        const dbJson = JSON.parse(raw || '{}');
        for (const key of Object.keys(dbJson)) {
          const meta = dbJson[key]?.doc?.metadata;
          const name = meta?.fileName;
          const ftype = meta?.fileType;
          if (name && ftype && !fileTypeByName[name]) {
            fileTypeByName[name] = ftype;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read local vector DB for types:', err);
    }

    const fileList = files.map(file => {
      const stat = fs.statSync(path.join(uploadDir, file));
      return {
        name: file,
        url: `/uploads/${encodeURIComponent(file)}`,
        size: stat.size,
        // expose upload/creation date and type if known
        uploadDate: stat.birthtime?.toISOString?.() || stat.ctime?.toISOString?.() || undefined,
        fileType: fileTypeByName[file] || undefined,
      };
    });

    res.json(fileList);
  } catch (err) {
    console.error('Error reading upload directory:', err);
    res.status(500).send('Failed to read files');
  }
});


//************************** Shopify backend from our app ****************************************


// Endpoint to get product from shopify and send data to the frontend

app.post('/product/get', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).send('Missing required field: id');

    const result = await getProductDetails.run(id);
    res.json(result);
  } catch (error: unknown) {
    console.error('Error fetching Shopify product:', error);

    if (error instanceof Error) {
      // TypeScript reconnaît maintenant "error.message"
      res.status(500).json({
        error: 'An unexpected error occurred while fetching the product details.',
        details: error.message,
      });
    } else {
      // fallback pour les erreurs non-Error (string, number, etc.)
      res.status(500).json({
        error: 'An unexpected error occurred while fetching the product details.',
        details: String(error),
      });
    }
  }
});


//Create a product on shopify endpoint

app.post('/product/create', async (req, res) => {
  try {
    const { title, descriptionHtml, price, sku } = req.body;

    // Validation rapide côté serveur
    if (!title || !descriptionHtml || !price || !sku) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const result = await createProduct.run({ title, descriptionHtml, price, sku });
    res.json(result);
  } catch (error: unknown) {
    console.error('Error creating Shopify product:', error);

    if (error instanceof Error) {
      res.status(500).json({
        error: 'Failed to create product.',
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Unknown error occurred.',
        details: String(error),
      });
    }
  }
});


// Endpoint for updating a product details on shopify

app.post("/product/update", async (req, res) => {
  try {
    const result = await updateProduct(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /shopify/update:", error);
    res.status(500).json({ error: error.message });
  }
});





app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});