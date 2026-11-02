# CV Tailor

Adaptez votre CV à chaque offre d'emploi en quelques secondes, avec un PDF lisible par les logiciels de tri (ATS).

**Démo :** https://cv-tailor-blue.vercel.app

## Fonctionnement

1. **Mon CV** : importez votre CV (PDF ou DOCX). Il est structuré automatiquement, puis vous le vérifiez et le complétez une seule fois. Il sert ensuite de base à toutes vos candidatures.
2. **Candidature** : collez le texte d'une offre. L'application analyse l'offre, propose des ajustements que vous acceptez ou refusez, puis génère :
   - un **CV adapté** à l'offre, en 1 ou 2 pages maximum ;
   - une **lettre de motivation** (ton professionnel ou direct, format court ou standard).

### Points clés

- **Test ATS intégré** : affiche le texte extrait du PDF généré, dans l'ordre de lecture, comme le ferait un logiciel de tri (test « Ctrl+A, Ctrl+C »).
- **Données locales** : le CV est enregistré automatiquement dans le navigateur. Vous pouvez télécharger une sauvegarde et la restaurer sur un autre appareil.
- **Accès protégé** : les appels à l'IA sont protégés par un mot de passe d'application.

## Stack technique

- **Front-end** : React, TypeScript et Vite
- **API** : fonctions serverless Vercel (dossier `api/`)
- **IA** : API OpenAI
- **Validation** : schémas partagés entre le front et l'API (`shared/schemas`)

### Routes API

| Route          | Rôle                                                |
| -------------- | --------------------------------------------------- |
| `/api/extract` | Structure le texte brut d'un CV                     |
| `/api/analyze` | Analyse une offre au regard du CV                   |
| `/api/tailor`  | Génère le CV adapté à partir des ajustements acceptés |
| `/api/letter`  | Génère la lettre de motivation                      |

Chaque route vérifie l'en-tête `X-App-Password`. Le mot de passe est demandé une fois dans le navigateur, puis mémorisé localement.

## Installation en local

```bash
npm install
```

Créez un fichier `.env.local` à la racine (il ne doit pas être commité) :

```bash
OPENAI_API_KEY=sk-...
APP_PASSWORD=un-mot-de-passe-long   # facultatif en local : sans lui, l'accès est libre
```

Lancez le projet avec la CLI Vercel, pour que les routes `/api` fonctionnent aussi :

```bash
npx vercel dev
```

`npm run dev` lance uniquement le front Vite, sans l'API.

## Déploiement sur Vercel

Ajoutez les variables d'environnement, en type **Secret** :

```bash
vercel env add OPENAI_API_KEY --environment production
vercel env add APP_PASSWORD --environment production
```

Faites de même avec `--environment preview` pour protéger les déploiements de prévisualisation. Puis déployez :

```bash
vercel --prod
```

Une variable ajoutée ou modifiée ne s'applique qu'après un nouveau déploiement.

### Sécurité

- Ne préfixez jamais ces variables par `VITE_` : elles seraient incluses dans le code envoyé au navigateur.
- Fixez une limite de dépense mensuelle dans les paramètres de votre compte OpenAI.
- Le mot de passe est comparé côté serveur, en temps constant.