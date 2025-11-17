import {genkit, z} from "genkit";
import { shopifyHeaders, url } from "./shopifyConfig.js";


const initGenkit = genkit({
  plugins: [],
});

const query = `
  query getProduct($id: ID!) {
  product(id: $id) {
     category {
      name
    }
    description
    title
    variants(first: 10) {
      nodes {
        sku
        displayName
      }
    }
    media(first: 1) {
      nodes {
        ... on MediaImage {
          image {
            url
          }
        }
      }
    }
  }
}
`;
// --- Define a Genkit Flow ---
export const getProductDetails = initGenkit.defineFlow(
  {
    name: "getProductDetails",
    inputSchema: z.string(),
  },
  async (id) => {

    const res = await fetch(url, {
      method: "POST",
      headers: shopifyHeaders,
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/Product/${id}` },
      }),
    });

    if (!res.ok) {
      const data = await res.text();
      throw new Error(`Shopify API Error ${res.status}: ${data}`);
    }

    const data = await res.json();

    const product = data.data?.product;
    if (!product) throw new Error("❌ No product found for that ID.");

    const title = product.title;
    const category = product.category?.name || "No category available";
    const description = product.description;
    const variants =
      product.variants?.nodes?.map((v: any) => ({
        sku: v.sku,
        name: v.displayName,
      })) || [];

    const imageUrl = product.media.nodes[0]?.image.url || "No image available";

    return { title, description, category, variants, imageUrl };
  }
);

// // --- Run the flow manually for testing ---
// (async () => {
//   try {
//     const result = await getProductDetails("10115013837122");
//     console.log("✅ Product:", result);
//   } catch (err) {
//     console.error(err);
//   }
// })();
