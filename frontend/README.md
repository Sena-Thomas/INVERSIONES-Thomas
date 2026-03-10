This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values below. **Never commit `.env`.**

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | [Neon](https://neon.tech) or any Postgres provider |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Same page as above |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption | Run `openssl rand -base64 32` in your terminal |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`) | Your deployment URL |
| `GEMINI_API_KEY` | Google Gemini API key for the chatbot | [Google AI Studio](https://aistudio.google.com/) → Get API Key |

### Google OAuth setup

1. Go to <https://console.cloud.google.com/> and create (or select) a project.
2. Enable the **Google+ API** (or "Google Identity").
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Add the following **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://<your-domain>/api/auth/callback/google` (production)
6. Copy the **Client ID** → `GOOGLE_CLIENT_ID` and **Client Secret** → `GOOGLE_CLIENT_SECRET`.

### Google Gemini setup

1. Go to <https://aistudio.google.com/> and sign in with your Google account.
2. Click **"Get API Key"** → **"Create API key"**.
3. Copy it → `GEMINI_API_KEY`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
