import dotenv from "dotenv";
dotenv.config();

const token = process.env.SHOPIFY_TOKEN;

if (!token) {
  throw new Error(" Missing SHOPIFY_TOKEN environment variable.");
}

const url = "https://ai-app-hec.myshopify.com/admin/api/2025-10/graphql.json";

const shopifyHeaders = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": token,
};

export { token, url, shopifyHeaders };
