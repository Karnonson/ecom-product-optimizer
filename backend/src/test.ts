// //Old2 main.ts without file validation

// import express from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import { indexGuideLines } from './indexer.js';
// import { generateProductDetails } from './retriever.js';

// const app = express();
// const port = 3000;

// // Ensure upload directory exists
// const uploadDir = 'src/files/';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname); // keep original filename
//   }
// });

// // Validate file type: only allow PDFs
// const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   if (file.mimetype === 'application/pdf') {
//     cb(null, true);
//   } else {
//     cb(new Error('Only PDF files are allowed'));
//   }
// };

// const upload = multer({ storage: storage, fileFilter: fileFilter });

// const csvUpload = multer({ storage: multer.memoryStorage() });

// // Serve static files from the 'public' directory
// app.use(express.static('public'));
// app.use(express.json()); //new line added for handling form data to use in the retriever

// // Handle file upload and indexing
// app.post('/upload', upload.single('pdfFile'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   const filePath = req.file.path;

//   try {
//     const result = await indexGuideLines({ filePath });
//     if (result.success) {
//       res.send(`File uploaded and indexed successfully. ${result.documentsIndexed} documents were created.`);
//     } else {
//       res.status(500).send(`Failed to index file: ${result.error}`);
//     }
//   } catch (error) {
//     console.error('Error processing file:', error);
//     res.status(500).send('An unexpected error occurred during indexing.');
//   }
// });

// // Handle generate product details
// app.post('/generate', async (req, res) => {
//   try {
//     const result = await generateProductDetails(req.body);
//     res.json(result);
//   } catch (error) {
//     console.error('Error generating product details:', error);
//     res.status(500).send('An unexpected error occurred during generation.');
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });




// //Old1 main.ts without file validation


// // import express from 'express';
// // import multer from 'multer';
// // import { indexGuideLines } from './indexer.js';

// // const app = express();
// // const port = 3000;

// // // Configure multer for file uploads
// // const storage = multer.diskStorage({
// //   destination: function (req, file, cb) {
// //     cb(null, 'src/files/');
// //   },
// //   filename: function (req, file, cb) {
// //     cb(null, file.originalname);
// //   }
// // });

// // const upload = multer({ storage: storage });

// // // Serve static files from the 'public' directory
// // app.use(express.static('public'));

// // // Handle file upload and indexing
// // app.post('/upload', upload.single('pdfFile'), async (req, res) => {
// //   if (!req.file) {
// //     return res.status(400).send('No file uploaded.');
// //   }

// //   const filePath = req.file.path;

// //   try {
// //     const result = await indexGuideLines({ filePath: `${filePath}` });
// //     if (result.success) {
// //       res.send(`File uploaded and indexed successfully. ${result.documentsIndexed} documents were created.`);
// //     } else {
// //       res.status(500).send(`Failed to index file: ${result.error}`);
// //     }
// //   } catch (error) {
// //     console.error('Error processing file:', error);
// //     res.status(500).send('An unexpected error occurred during indexing.');
// //   }
// // });

// // app.listen(port, () => {
// //   console.log(`Server is running at http://localhost:${port}`);
// // });

//**************************************** */




//Testing gestProduct endpoint

// (async () => {
//   const res = await fetch("http://localhost:3000/product/get", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({ id: "10133814477122" })
//   });

//   const data = await res.json();
//   console.log(JSON.stringify(data, null, 2));
// })();


// //Testing Create Product

// (async () => {
//   const res = await fetch("http://localhost:3000/create/product", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       title: "Genkit Test Product",
//       descriptionHtml: "<p>This product was created via Genkit flow.</p>",
//       handle: "genkit-test-product",
//       price: 39.99,
//       sku: "GENKIT-001"
//     })
//   });

//   const data = await res.json();
//   console.log("✅ Created product:", JSON.stringify(data, null, 2));
// })();



// Testing Shopify update product details endpoint

// (
//   async () => {

// const res = await fetch("http://localhost:3000/product/update", {
//   method: "POST",
//   headers: { "Content-Type": "application/json" },
//   body: JSON.stringify({
//     id: "10133814477122",
//     title: "Genkit Test Product (Updated)",
//     descriptionHtml: `
//     <h1>Now updated via API!</h1>
//     <p>This product was created via Genkit flow.</p>
    
//     `
//   })
// });

//   const data = await res.json();
//   console.log("Response:", data);
// }
// ) ();

