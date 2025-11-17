import { genkit, z } from "genkit";
import { shopifyHeaders, url } from "./shopifyConfig.js";


// Initializing genkit so that we can use flows

const initGenkit = genkit({
  plugins: [],
})

const mutation = `mutation updateProduct($id: ID!, $title: String, $descriptionHtml: String) {
  productUpdate(
    product: {
      id: $id,
      title: $title,
      descriptionHtml: $descriptionHtml
    }
  ) {
    product {
      onlineStorePreviewUrl
      status
    }
  }
}
`
/*
This part is what our API call will return
product {
      onlineStorePreviewUrl
      status
    }
*/

export const updateProduct = initGenkit.defineFlow(
{name: "updateProduct",
  inputSchema: z.object({
    id: z.string(),
    title: z.string(),
    descriptionHtml: z.string(),
  })
},

async ({id, title, descriptionHtml}) => {

const response = await fetch(
  url,
  {
    method: "POST",
    headers: shopifyHeaders,
    body: JSON.stringify(
      {
      query: mutation,
      variables: {
        id: `gid://shopify/Product/${id}`,
        title,
        descriptionHtml,
      }
    }
    )
  }
);

if (!response.ok) {
  const data = await response.text();
  throw new Error(`Shopify API Error ${response.status}: ${data}`);
};

const data = await response.json();
const productUpdate = data.data?.productUpdate;
if (!productUpdate?.product) {
  console.error("Shopify API returned:", JSON.stringify(data, null, 2));
  throw new Error(" Failed to update product — no product returned from Shopify.");
};

// Check for potential error from the user

if (productUpdate.userErrors && productUpdate.userErrors.length > 0) {
  const errors = productUpdate.userErrors
    .map((e: { field: any[]; message: any; }) => `${e.field.join(".")}: ${e.message}`)
    .join("; ");
  throw new Error(`Shopify user errors: ${errors}`);
};

//Make sure that an actual product have been updated

if (!productUpdate.product) {
  console.error("Shopify API returned:", JSON.stringify(data, null, 2));
  throw new Error("Failed to update product — no product returned.");
}


const { onlineStorePreviewUrl, status } = productUpdate.product;
return { onlineStorePreviewUrl, status };


}
);

//Run the flow manually for testing...

// (
//   async () => {
//     try {
//       let user = {id: "10115244294466", title: "Blabla title", descriptionHtml: "Description test blablabla"}
//     const result = await updateProduct(user);
//     console.log("Your result:", result);
//     } catch(err) {console.error(err)}
//   }
// ) ();