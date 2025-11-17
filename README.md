# Guide du projet - Optimiseur de Descriptions de Produits E-commerce

L'**Optimiseur de Descriptions de Produits E-commerce** est une application alimentée par l'IA qui analyse les avis clients et génère des descriptions de produits améliorées pour les plateformes e‑commerce — avec une **intégration Shopify**.
Elle aide les marchands à affiner leurs fiches produit en tirant parti des retours réels des clients, garantissant que chaque description est optimisée pour la conversion, la clarté et le référencement (SEO).

## Fonctionnalités

* **Optimisation avec les avis**
  Téléversez un fichier CSV d'avis clients pour un produit spécifique. L'IA analyse les thèmes récurrents, les sentiments et les enseignements, puis génère une description de produit convaincante et informée par les avis.

* **Optimisation sans avis**
  Même sans avis, le système peut créer des descriptions persuasives en utilisant vos **mots-clés**, votre **ton de marque** et vos **directives**.

* **Intégration Shopify**
  Connectez-vous directement à votre boutique Shopify pour **récupérer les données de produit** et **publier les descriptions optimisées** instantanément, sans copier-coller manuel.

* **Ajustement des descriptions**
  Affinez les résultats générés par l'IA en fournissant des instructions supplémentaires ou des préférences de style avant la publication.

* **Prise en charge multilingue**
  Générez et modifiez des descriptions en **anglais** et en **français**, assurant une localisation cohérente pour les boutiques bilingues.

* **Gestion des fichiers d'entraînement**
  Téléversez des fichiers d'**inclusion** et d'**exclusion** pour guider le modèle d'IA, en lui apprenant ce qu'il faut mettre en avant ou ignorer pour des résultats mieux alignés avec votre marque.

## Pile technologique et dépendances

### **Frontend**

Le frontend a été conçu principalement avec Lovable, un outil d'IA pour la génération de code.
Voici les dépendances principales :

* **Vite** – Outil de build ultra-rapide pour React.
* **React** – Bibliothèque UI basée sur les composants.
* **TypeScript** – JavaScript typé pour un développement évolutif.
* **Shadcn UI** – Composants UI réutilisables et accessibles basés sur Radix.
* **Tailwind CSS** – Framework CSS utilitaire pour un style moderne.

### **Backend**

Voici les dépendances principales :

* **Node.js (v22+)** – Environnement d'exécution JavaScript haute performance pour les services API.
* **Express** – Serveur web minimaliste et flexible pour les routes backend.
* **Genkit (Google AI)** – Framework pour la conception d'applications d'IA.
* **Multer** – Middleware pour le téléversement de fichiers (CSV, PDF, etc.).
* **Papaparse** – Analyseur CSV pour le traitement des données d'avis.
* **pdf-parse** – Extraction de texte à partir de documents PDF.
* **dotenv** – Gestion des variables d'environnement.

### **Gestion**

`pnpm` pour la gestion des dépendances, `Makefile` pour l'automatisation.

## Structure du dépôt

* `backend/` : serveur API (Express) et logique IA.
  * `src/index.ts` : routes principales et gestion des téléversements.
  * `src/ai/generate.ts` : génération des détails de produit.
  * `src/ai/optimize.ts` : optimisation des fiches produits.
  * `src/ai/indexer.ts` : indexation des PDF (guides de rédaction).
  * `src/files/` : dépôt des fichiers téléversés.
  * `src/shopify/` : assistants pour l'intégration de l'API Shopify (création/récupération/mise à jour).
  * `public/` : ressources statiques exposées par le backend.
* `frontend/` : application cliente (Vite + React + shadcn/ui).
  * `src/pages/` : pages principales (Dashboard, GenerateWithReviews, GenerateWithoutReviews, etc.).
  * `src/components/` et `src/components/ui/` : composants d'interface utilisateur génériques.
  * `contexts/`, `hooks/`, `lib/` : logique partagée.

## Endpoints du backend

* `POST /upload` : téléverse un PDF et l'indexe dans la base de données vectorielle (`__db_guidelinesQA.json`) créée automatiquement lorsqu’un fichier est téléversé.
* `POST /generate` : régénère une description à partir des instructions de l’utilisateur, de la description optimisée et des guides de rédaction.
* `POST /optimize` : affine une description, avec ou sans avis.
* `GET /files` : liste les fichiers importés et leurs métadonnées dans le frontend.
* `DELETE /files/:filename` : supprime un fichier et nettoie l'index.
* `POST /product/get` : récupère un produit Shopify par son `id`.
* `POST /product/create` : crée un produit Shopify avec les éléments fournis (`title`, `descriptionHtml`, `price`, `sku`).
* `POST /product/update` : met à jour un produit avec les détails générés.

## Variables d'environnement du backend

À ajouter dans `backend/.env` (non versionné) :

* `PORT` : port HTTP du backend (par défaut 4461).
* `SHOPIFY_TOKEN` : la clé d'administration de l'API GraphQL de la boutique Shopify.
* `GEMINI_API_KEY` : la clé de l'API Gemini.

## Configuration pour le test en local

### Prérequis

* Node.js v22 ou une version ultérieure (NVM est recommandé pour la gestion des versions).
* pnpm installé globalement :

 ```bash
 npm install -g pnpm
 ```

### Installation

```bash
# Cloner le dépôt
git clone <URL_DU_DÉPÔT>
cd ai-product-optimizer

# Backend
cd backend
pnpm install

# Frontend
cd ../frontend
pnpm install
```

### Exécution en développement

```bash
# Backend
cd backend
pnpm run dev

# Frontend
cd ../frontend
pnpm run dev
```

Le frontend est accessible sur `http://localhost:8080` et le backend sur `http://localhost:4461` (par défaut).

* Pour lancer l'ensemble (frontend et backend) en une seule commande :

```bash
make dev
```

### Build et production

```bash
# Backend
cd backend
pnpm run build
pnpm run start

# Frontend
cd ../frontend
pnpm run build
pnpm run preview
```

## Données et stockage

* Fichiers téléversés : `backend/src/files/` (à ne pas versionner).
* Base de données vectorielle locale : `backend/__db_guidelinesQA.json` (nettoyée lors de la suppression de fichiers).
