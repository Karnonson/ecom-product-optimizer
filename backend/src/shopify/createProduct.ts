import { genkit, z } from "genkit";
import { shopifyHeaders, url } from "./shopifyConfig.js";

// ✅ Initialize Genkit instance
const initGenkit = genkit({
  plugins: [],
});

// ✅ Define the Shopify mutation for creating a product
const mutation = `
mutation createProduct($title: String!, $descriptionHtml: String!, $price: Money!, $sku: String!) {
  productSet(
    input: {
      title: $title,
      descriptionHtml: $descriptionHtml,
      productOptions: [
        {
          name: "Title",
          position: 1,
          values: [
            { name: "Default Title" }
          ]
        }
      ],
      variants: [
        {
          price: $price,
          sku: $sku,
          optionValues: [
            {
              optionName: "Title",
              name: "Default Title"
            }
          ]
        }
      ]
    }
  ) {
    product {
      id
      title
      onlineStorePreviewUrl
    }
    userErrors {
      field
      message
    }
  }
}
`;

// ✅ Define the flow
export const createProduct = initGenkit.defineFlow(
  {
    name: "createProduct",
    inputSchema: z.object({
        title: z.string(),
        descriptionHtml: z.string(),
        price: z.number(),
        sku: z.string(),
      }),
  },

  async ({ title, descriptionHtml, price, sku }) => {
    // Make the Shopify API call
    const response = await fetch(url, {
      method: "POST",
      headers: shopifyHeaders,
      body: JSON.stringify({
        query: mutation,
        variables: { title, descriptionHtml, price, sku },
      }),
    });

    // Handle HTTP-level errors
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API Error ${response.status}: ${text}`);
    }

    // Parse JSON response
    const data = await response.json();

    // Extract product data
    const productSet = data.data?.productSet;
    if (!productSet) {
      console.error("Unexpected Shopify API response:", JSON.stringify(data, null, 2));
      throw new Error("❌ Failed to create product — no data returned from Shopify.");
    }

    // // Handle Shopify user errors
    // if (productSet.userErrors && productSet.userErrors.length > 0) {
    //   const errors = productSet.userErrors.map(e => `${e.field}: ${e.message}`).join("; ");
    //   throw new Error(`Shopify returned user errors: ${errors}`);
    // }

    // Extract useful product info
    const { product } = productSet;
    return {
      id: product.id,
      title: product.title,
      onlineStorePreviewUrl: product.onlineStorePreviewUrl,
    };
  }
);
/*
// ✅ Test the flow manually
(async () => {
  try {
    const newProduct = {
      title: "Create product test",
      descriptionHtml: "<p>This is a test product created via API.</p>",
      handle: "product-test",
      price: 25.5,
      sku: "TEST-SKU-002",
    };

    const result = await createProduct(newProduct);
    console.log("🎉 Product successfully created!");
    console.log(result);
  } catch (err) {
    console.error("❌ Error creating product:", err);
  }
})();
*/