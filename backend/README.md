# ai-app
This app require: 
- NodeJS v22 or later
- pnpm but can use npm if you’re not using lanceDB. I tried to use it that’s why I change my Node package manager. Unfortunely LanceDB didn’t work as expected, it couldn’t retrieve thhe indexed content.
- Genkit v...

## To use this app, Install all dependencies including the local one if you want to run it localy.

# Prompt for UI:
- Create a frontend named public and add inside it:
- A page to upload file based on the main.ts file
- A page for interacting with retriever.ts

# Steps
- Add csv handle to the UI the /generate endpoint - ok
- Create /optimize endpoint new products - ok
- Connect get product button to shopify getProduct endpoint - ok
- Connect UI to backend
- Enhance the LLM prompt
- Add section to connect Shopify API key (Optional for now)
- Change the database name to Guides instead of menuQA
