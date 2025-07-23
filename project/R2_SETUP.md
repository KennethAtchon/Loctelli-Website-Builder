# R2 Storage Setup Guide

## Overview
The website builder now uses Cloudflare R2 for file storage instead of storing files directly in the database. This provides better performance, scalability, and cost efficiency.

## Environment Variables

Add these variables to your `.env` file:

```bash
# Cloudflare R2 Storage Configuration
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="loctelli-website-builder"
R2_PUBLIC_URL="https://your-public-r2-domain.com"
R2_ENABLED="true"
```

## How to Get R2 Credentials

1. **Account ID**: Found in Cloudflare dashboard under "Account Home" → "Account ID"
2. **API Tokens**: 
   - Go to "My Profile" → "API Tokens"
   - Create custom token with R2 permissions
   - Or use API keys from "R2 Object Storage" → "Manage R2 API tokens"
3. **Bucket Name**: The name you gave your R2 bucket
4. **Public URL**: Your custom domain or the default R2 domain

## Database Reset

Since we're starting fresh with R2 storage, you can reset the database:

```bash
npm run db:reset
```

This will clear all existing data and prepare the database for R2 storage.

## Storage Structure

Files are stored in R2 with the following structure:

```
loctelli-website-builder/
├── websites/
│   ├── {website-id}/
│   │   ├── original/
│   │   │   └── {original-zip-file}
│   │   ├── extracted/
│   │   │   ├── src/
│   │   │   ├── public/
│   │   │   ├── package.json
│   │   │   └── ...
│   │   ├── builds/
│   │   │   ├── latest/
│   │   │   └── {build-id}/
│   │   └── previews/
│   │       └── {preview-files}
│   └── ...
├── temp/
│   └── {temp-uploads}
└── cache/
    └── {cached-builds}
```

## Benefits

- **Database size reduction**: 80-90% smaller database
- **Better performance**: Faster queries, smaller backups
- **Scalability**: Unlimited file storage in R2
- **Cost efficiency**: R2 is cheaper than database storage
- **CDN benefits**: Global edge caching for static files

## Testing

To test the R2 integration:

1. Set up your R2 credentials in `.env`
2. Reset the database: `npm run db:reset`
3. Start the application: `npm run start:dev`
4. Upload a website through the API

The files should now be stored in R2 instead of the database. 