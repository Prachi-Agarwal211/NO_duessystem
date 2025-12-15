# Deployment Guide

## Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Local Development

```bash
npm install
npm run dev
```

## Production Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

For detailed migration guide, see `COMPLETE_PROJECT_RESTRUCTURING_ANALYSIS.md`.
