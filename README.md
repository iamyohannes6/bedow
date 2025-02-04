# BEDOW - Behance Gallery Downloader

A modern web application for downloading high-quality images from Behance galleries.

## Features

- 🎯 Smart image filtering
- ⚡ 20 downloads per hour (free plan)
- 📁 Organized downloads by project
- 🎨 High-quality image downloads
- 💾 Bulk download support
- 🚀 Fast and responsive interface

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment on Netlify

### Option 1: One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/bedow)

### Option 2: Manual Deployment

1. Push your code to a GitHub repository
2. Log in to your Netlify account
3. Click "New site from Git"
4. Choose your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables in Netlify:
   - Copy variables from `.env.example`
   - Add them in Site Settings > Build & Deploy > Environment
7. Deploy!

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- React Query
- Heroicons

## Development

### Project Structure

```
src/
  ├── pages/          # Next.js pages
  │   ├── api/        # API routes
  │   └── index.tsx   # Home page
  ├── components/     # React components
  ├── types/          # TypeScript types
  └── utils/          # Utility functions
```

### Rate Limiting

The free plan includes:
- 20 downloads per hour
- Rate limit tracking by IP
- Automatic reset after one hour

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required variables:
- `SITE_URL`: Your production URL
- `NODE_ENV`: Set to 'production' for deployment

### Building for Production

```bash
npm run build
# or
yarn build
```

## Chrome Extension

For unlimited downloads and additional features, check out our Chrome extension:
[Chrome Web Store Link]

## License

MIT License - See LICENSE file for details 