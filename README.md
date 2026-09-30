# Campus Clash (College.io) - MITE Edition

Fast-paced 3D First-Person Shooter (FPS) set on the Mangalore Institute of Technology and Engineering (MITE) campus.

Built with React, TypeScript, Three.js, Tailwind CSS, and the Web Audio API.

---

## Deploying to Vercel

This repository is pre-configured and 100% ready for Vercel deployment.

### Method 1: Deploy via Vercel Dashboard (Recommended)
1. Push this codebase to your **GitHub**, **GitLab**, or **Bitbucket** account.
2. Go to [vercel.com/new](https://vercel.com/new) and log in.
3. Import your **Campus Clash** repository.
4. Vercel will automatically detect the **Vite** preset:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**. Your app will be live on your `.vercel.app` domain in seconds!

### Method 2: Deploy via Vercel CLI
If you have the Vercel CLI installed:
```bash
npm install -g vercel
vercel
```
Follow the CLI prompts and select default settings. For production:
```bash
vercel --prod
```

---

## Included Configurations for Vercel

- **`vercel.json`**:
  - Automatically handles Single-Page Application (SPA) routing with rewrites to `/index.html` (prevents 404s on browser reloads).
  - Configures optimized caching headers for `/assets/` and standard security headers.
  - Serves `/campus_clash.html` directly as a standalone static version.
- **`public/campus_clash.html`**:
  - Bundled directly into `dist/` upon build for offline or direct link usage (`your-site.vercel.app/campus_clash.html`).
- **`vite.config.ts`**:
  - Cleaned ES module paths and configured chunk sizes for fast Vercel edge/static delivery.
- **`.gitignore`**:
  - Excludes `node_modules`, `dist`, `.vercel`, and local logs.

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
