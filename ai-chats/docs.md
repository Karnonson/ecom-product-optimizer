# Documentation du projet — AI Optimisateur de Description de Produit Ecommerce

Cette documentation explique l'architecture, la configuration, l'installation, l'exécution et les étapes nécessaires pour reproduire et développer ce projet. Elle couvre le backend (Node/TypeScript) et le frontend (Vite + React + shadcn/ui), ainsi que des recommandations pour la CI, la gestion des secrets et les tests.

## Aperçu

- **But** : Service pour générer et optimiser des descriptions/éléments produits à l'aide de composants IA, indexer des documents (PDF) en base vectorielle locale, et synchroniser avec Shopify.
- **Stack backend** : Node.js, TypeScript, Express, Genkit/LLM plugins, dev-local-vectorstore pour stockage local des embeddings.
- **Stack frontend** : Vite + React + TypeScript (+ shadcn/ui), développé/généré en partie avec un assistant IA (lovable).

## Structure du dépôt

- `/backend` : code du serveur API
  - `package.json` : scripts (voir ci-dessous)
  - `.env` : variables d'environnement (ne pas versionner)
  - `src/index.ts` : serveur Express et routes principales
  - `src/ai/` : logique IA
    - `generate.ts` : génération de détails produits à partir d'input / CSV
    - `optimize.ts` : optimisation des détails produits
    - `indexer.ts` : indexation de PDFs dans la base vectorielle locale
  - `src/files/` : dossier d'uploads pour les PDFs
  - `__db_guidelinesQA.json` : base vectorielle locale générée par `dev-local-vectorstore` (fichier JSON)
  - `src/shopify/` : helpers pour créer/mettre à jour/récupérer produits Shopify

- `/frontend` : application client (Vite + React)
  - `package.json` : scripts frontend (dev/build/preview)
  - `src/` : composants, pages et UI
  - `components.json` et dépendances `lovable-*` qui indiquent usage d'un générateur IA pour certains composants
- `/scripts` :  Demarrage full-stack

## Endpoints principaux (backend)

- `POST /upload` : upload d'un fichier PDF (champ `pdfFile`) -> indexation.
- `POST /generate` : génération de détails produit. Optionnel : upload CSV (`customerReviewsCSV`) contenant avis clients.
- `POST /optimize` : optimisation de détails produit. Optionnel : upload CSV (`customerReviewsCSV`).
- `GET /files` : liste des fichiers uploadés avec métadonnées.
- `DELETE /files/:filename` : supprime fichier uploadé et tente de nettoyer les entrées indexées.
- `GET /uploads/<filename>` : accès statique aux fichiers uploadés.
- `POST /product/get` : récupère un produit Shopify (body: `{ id }`).
- `POST /product/create` : crée un produit Shopify (body: `{ title, descriptionHtml, price, sku }`).
- `POST /product/update` : met à jour un produit Shopify (body: dépend du helper `updateProduct`).

Vérifiez `backend/src/index.ts` pour le comportement exact et la gestion d'erreurs.

## Scripts utiles

- Backend (depuis `/backend`)
  - Installer deps :

    ```bash
    cd backend
    pnpm install
    ```

  - Développement (TypeScript en watch via `tsx`) :

    ```bash
    pnpm run dev
    ```

  - Compiler et démarrer (production) :

    ```bash
    pnpm run build
    pnpm run start
    ```

- Frontend (depuis `/frontend`)
  - Installer deps :

    ```bash
    cd frontend
    pnpm install
    ```

  - Lancer en dev :

    ```bash
    pnpm run dev
    ```

  - Build production :

    ```bash
    pnpm run build
    pnpm run preview
    ```

Remarque : si vous préférez `npm` ou `yarn`, adaptez les commandes.

## Variables d'environnement du backend

Variables attendues (liste indicative — vérifier le code et `.env` actuel) :

- `PORT` : port où tourner le backend (ex: `3000`).
- `SHOPIFY_STORE`, `SHOPIFY_API_KEY`, `SHOPIFY_PASSWORD` ou `SHOPIFY_ACCESS_TOKEN` : accès Shopify.
- `GENKIT_API_KEY` ou variables liées à Genkit / fournisseur LLM si utilisées.
- `OPENAI_API_KEY` ou autres clés LLM selon la configuration.

## Données et stockage local

- Les fichiers uploadés sont dans `backend/src/files/`.
- La base vectorielle locale utilisée pour les Q/A guideline est `backend/__db_guidelinesQA.json`. Elle est gérée par le plugin `dev-local-vectorstore` et peut être lue/éditée par le serveur pour opérations de nettoyage.

## Points de développement importants

- `backend/src/ai/` : logique IA — séparer clairement : extraction/indexation (`indexer.ts`), génération (`generate.ts`), optimisation (`optimize.ts`).
- Validation et erreurs : `optimize` expose des erreurs Zod si la validation échoue (retour 400).
- Lorsque vous supprimez un fichier, le serveur essaie de nettoyer les entrées correspondantes dans `__db_guidelinesQA.json`.

## Frontend

Le frontend a été généré avec Lovable, un générateur de code IA.

- Le prompt utilisé:

## Reproductibilité

1. Forker et Cloner ce repo dans votre éditeur préféré
2. Préparer les secrets (créer `.env` à partir de `.env.example`)
3. Installer dépendances backend et frontend (`pnpm install` dans chaque dossier)
4. Exécuter make dev pour démarer le backend et le frontend simultanément. Sinon, faites les étapes 5-6 pour un lancement individuel.
5. Lancer backend : `pnpm run dev` dans `/backend`
6. Lancer frontend : `pnpm run dev` dans `/frontend`

## Développement local

Lancement rapide en local (sans script supplémentaire) : utilisez la cible `dev` du `Makefile`, qui démarre le backend et le frontend en parallèle et préfixe les logs par `[backend]` / `[frontend]`.

```bash
# depuis la racine du dépôt
make dev
```

Le `Makefile` utilise `bash` et `pnpm --prefix <folder> run dev` pour appeler les commandes dans chaque sous-dossier. Si vous préférez `npm` ou `yarn`, éditez la cible `dev` du `Makefile`.

Remarque : un script `scripts/dev.sh` existe également comme alternative (il fait la même chose). Vous pouvez le laisser ou le supprimer si vous préférez n'utiliser que `make`.

## Sécurité

- Ne pas commit le fichier `.env` ni `__db_guidelinesQA.json` si contenant données sensibles.
- Utiliser les secrets fournis par la plateforme de déploiement pour les clés API.
- Limiter l'accès d'API Shopify via tokens restreints.

## Fichiers clés et responsabilité

- `backend/src/index.ts` : routes et logique d'upload / index / export vers Shopify.
- `backend/src/ai/generate.ts` : logique pour générer descriptions/détails produits.
- `backend/src/ai/optimize.ts` : logique d'optimisation — point d'entrée du endpoint `/optimize`.
- `backend/src/ai/indexer.ts` : indexation PDF -> embeddings -> `__db_guidelinesQA.json`.
- `backend/src/shopify/*` : adaptateurs Shopify (create/get/update).
- `frontend/src/pages/*` : pages utilisateur et intégration avec l'API backend.

## Étapes futures & suggestions

- Ajouter un `backend/.env.example` et documenter toutes les variables attendues.
- Ajouter des tests automatisés (unit + intégration) pour les endpoints critiques.
- Installer un linter/formatter (ESLint/Prettier) et l'exécuter en CI.
- Ajouter un script `make` ou `scripts/dev.sh` qui lance backend+frontend en parallèle pour faciliter le dev local.

## Support & contact

Pour des modifications, commencez par ouvrir une issue décrivant la reproduction exacte et les étapes testées. Incluez les logs du serveur et les variables d'environnement (mais pas les secrets).

---

Documentation générée automatiquement par l’IA.
