# Vercel deployment

This dashboard is a standalone Next.js application inside the Uden monorepo.

Configure the Vercel project with:

- Root Directory: `packages/dashboard`
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

Do not configure the Vercel project to build the dashboard from the repository root. The desktop and Android clients remain in their existing paths and are not part of this deployment.
