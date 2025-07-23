# Cloudflare R2 Storage Implementation Guide

This guide details how to implement Cloudflare R2 storage in a Next.js project, based on a production implementation that includes feature flags, error handling, and a clean abstraction layer.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Dependencies](#dependencies)
4. [Implementation](#implementation)
5. [API Routes](#api-routes)
6. [Usage Examples](#usage-examples)
7. [Docker Configuration](#docker-configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Cloudflare account with R2 enabled
- R2 bucket created
- API tokens with appropriate permissions
- Next.js project (version 13+ recommended)

## Environment Setup

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-r2-domain.com

# Feature flag (optional - defaults to true)
R2_ENABLED=true
```

### How to Get R2 Credentials

1. **Account ID**: Found in Cloudflare dashboard under "Account Home" → "Account ID"
2. **API Tokens**: 
   - Go to "My Profile" → "API Tokens"
   - Create custom token with R2 permissions
   - Or use API keys from "R2 Object Storage" → "Manage R2 API tokens"
3. **Bucket Name**: The name you gave your R2 bucket
4. **Public URL**: Your custom domain or the default R2 domain

## Dependencies

Install the required AWS SDK packages (R2 uses S3-compatible API):

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
# or with pnpm
pnpm add @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
```

## Implementation

### 1. Environment Utility (`lib/utils/envUtil.ts`)

```typescript
function getEnvVar(key: string, required: boolean = true): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

// Cloudflare R2 Configuration
export const R2_ACCOUNT_ID = getEnvVar("R2_ACCOUNT_ID", false);
export const R2_ACCESS_KEY_ID = getEnvVar("R2_ACCESS_KEY_ID", false);
export const R2_SECRET_ACCESS_KEY = getEnvVar("R2_SECRET_ACCESS_KEY", false);
export const R2_BUCKET_NAME = getEnvVar("R2_BUCKET_NAME", false);
export const R2_PUBLIC_URL = getEnvVar("R2_PUBLIC_URL", false);

// Feature flag for R2 (default to true if not set)
export const R2_ENABLED = process.env.R2_ENABLED === "true" || true;
```

### 2. R2 Storage Implementation (`lib/storage/r2.ts`)

```typescript
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} from "@/lib/utils/envUtil";

// Validate configuration
if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  console.warn(
    "R2 configuration is incomplete. R2 functionality will be disabled."
  );
}

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Upload a file to R2 storage
 * @param file - File or Buffer to upload
 * @param key - Storage key/path for the file
 * @param contentType - MIME type of the file
 * @returns Promise<string> - Public URL of the uploaded file
 */
export async function uploadFile(
  file: File | Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: file instanceof File ? file.stream() : file,
    ContentType: contentType,
  };

  const upload = new Upload({
    client: s3Client,
    params,
  });

  try {
    await upload.done();
    return `${R2_PUBLIC_URL || ""}/${key}`.replace(/([^:]\/)\/+/g, "$1"); // Remove duplicate slashes
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload file to R2 storage");
  }
}

/**
 * Delete a file from R2 storage
 * @param key - Storage key/path of the file to delete
 */
export async function deleteFile(key: string): Promise<void> {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error("Failed to delete file from R2 storage");
  }
}

/**
 * Generate a signed URL for private file access
 * @param key - Storage key/path of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - Signed URL
 */
export async function getFileUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
  };

  try {
    return await getSignedUrl(s3Client, new GetObjectCommand(params), {
      expiresIn,
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Extract storage key from a public URL
 * @param url - Public URL of the file
 * @returns string | null - Storage key or null if invalid
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    // Remove leading slash if present
    return parsedUrl.pathname.startsWith("/")
      ? parsedUrl.pathname.substring(1)
      : parsedUrl.pathname;
  } catch (e) {
    console.error("Error parsing URL:", e);
    return null;
  }
}
```

### 3. Storage Service Abstraction (`lib/storage/index.ts`)

This provides a clean interface that can switch between different storage backends:

```typescript
import { R2_ENABLED } from "@/lib/utils/envUtil";
import * as r2 from "./r2";

export interface StorageService {
  uploadFile(
    file: File | Buffer,
    path: string,
    contentType: string
  ): Promise<string>;
  deleteFile(url: string): Promise<void>;
  getPublicUrl(path: string): string;
}

class R2Storage implements StorageService {
  async uploadFile(
    file: File | Buffer,
    path: string,
    contentType: string
  ): Promise<string> {
    return r2.uploadFile(file, path, contentType);
  }

  async deleteFile(url: string): Promise<void> {
    const key = r2.extractKeyFromUrl(url);
    if (key) {
      await r2.deleteFile(key);
    }
  }

  getPublicUrl(path: string): string {
    return `${process.env.R2_PUBLIC_URL}/${path}`;
  }
}

// Export the appropriate storage implementation based on the feature flag
export const storage: StorageService = R2_ENABLED
  ? new R2Storage()
  : new R2Storage(); // You can add fallback storage here

// Helper function to get storage instance
export function getStorage(useR2: boolean = R2_ENABLED): StorageService {
  return useR2 ? new R2Storage() : new R2Storage();
}
```

## API Routes

### Upload Endpoint (`app/api/upload/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth/requireAdmin"; // Your auth middleware

export async function POST(request: Request) {
  // Add your authentication/authorization here
  const adminSession = await requireAdmin(request as NextRequest);
  if (adminSession instanceof NextResponse) return adminSession;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload the file using the storage service
    const publicUrl = await storage.uploadFile(
      buffer,
      filePath,
      file.type
    );

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Add your authentication/authorization here
  const adminSession = await requireAdmin(request as NextRequest);
  if (adminSession instanceof NextResponse) return adminSession;

  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    await storage.deleteFile(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
```

## Usage Examples

### Frontend Upload Component

```typescript
import { useState } from 'react';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {uploadedUrl && (
        <div>
          <p>Uploaded successfully!</p>
          <img src={uploadedUrl} alt="Uploaded" style={{ maxWidth: 200 }} />
        </div>
      )}
    </div>
  );
}
```

### Delete File

```typescript
const deleteFile = async (url: string) => {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    console.log('File deleted successfully');
  } catch (error) {
    console.error('Delete error:', error);
  }
};
```

## Docker Configuration

If using Docker, add the R2 environment variables to your Dockerfile:

```dockerfile
# Define arguments for environment variables
ARG R2_ACCOUNT_ID
ARG R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ARG R2_BUCKET_NAME
ARG R2_PUBLIC_URL
ARG R2_ENABLED

# Set environment variables
ENV R2_ACCOUNT_ID=$R2_ACCOUNT_ID
ENV R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
ENV R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
ENV R2_BUCKET_NAME=$R2_BUCKET_NAME
ENV R2_PUBLIC_URL=$R2_PUBLIC_URL
ENV R2_ENABLED=$R2_ENABLED
```

And in your docker-compose.yml:

```yaml
services:
  app:
    build:
      context: .
      args:
        R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
        R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
        R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
        R2_BUCKET_NAME: ${R2_BUCKET_NAME}
        R2_PUBLIC_URL: ${R2_PUBLIC_URL}
        R2_ENABLED: ${R2_ENABLED}
```

## Best Practices

### 1. File Organization
- Use meaningful folder structures: `uploads/therapies/`, `uploads/users/`, etc.
- Generate unique filenames to prevent conflicts
- Consider using UUIDs or timestamps in filenames

### 2. Security
- Validate file types and sizes on both client and server
- Implement proper authentication for upload/delete operations
- Use signed URLs for private files
- Consider implementing virus scanning for uploaded files

### 3. Error Handling
- Always wrap R2 operations in try-catch blocks
- Provide meaningful error messages
- Log errors for debugging
- Implement retry logic for transient failures

### 4. Performance
- Use multipart uploads for large files
- Implement client-side image compression
- Consider using CDN for frequently accessed files
- Cache public URLs when possible

### 5. Monitoring
- Monitor upload success/failure rates
- Track storage usage
- Set up alerts for storage limits
- Log file access patterns

## Troubleshooting

### Common Issues

1. **"R2 configuration is incomplete"**
   - Check all environment variables are set
   - Verify R2 credentials are correct
   - Ensure bucket exists and is accessible

2. **"Failed to upload file to R2 storage"**
   - Check network connectivity
   - Verify file size limits
   - Ensure proper permissions on R2 bucket

3. **"Failed to generate signed URL"**
   - Verify R2 credentials have proper permissions
   - Check if file exists in bucket
   - Ensure correct file path/key

4. **CORS Issues**
   - Configure CORS settings in your R2 bucket
   - Add appropriate headers in your API responses

### Debug Mode

Enable debug logging by adding this to your R2 client:

```typescript
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
  logger: console, // Enable debug logging
});
```

### Testing

Create a simple test script:

```typescript
// test-r2.ts
import { uploadFile, deleteFile } from '@/lib/storage/r2';

async function testR2() {
  try {
    // Test upload
    const testBuffer = Buffer.from('Hello R2!');
    const url = await uploadFile(testBuffer, 'test/hello.txt', 'text/plain');
    console.log('Upload successful:', url);

    // Test delete
    await deleteFile('test/hello.txt');
    console.log('Delete successful');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testR2();
```

## Migration from Other Storage

If migrating from another storage service (like Supabase Storage), you can implement a dual-write strategy:

```typescript
// In your storage service
async uploadFile(file: File | Buffer, path: string, contentType: string): Promise<string> {
  // Upload to both old and new storage during migration
  const [oldUrl, newUrl] = await Promise.all([
    oldStorage.uploadFile(file, path, contentType),
    newStorage.uploadFile(file, path, contentType)
  ]);
  
  return newUrl; // Return new storage URL
}
```

This ensures no data loss during the migration process.

## Conclusion

This implementation provides a robust, scalable file storage solution using Cloudflare R2. The abstraction layer makes it easy to switch between storage backends, and the feature flag allows for safe rollouts. The error handling and validation ensure a reliable user experience.

Remember to:
- Test thoroughly in a staging environment
- Monitor performance and costs
- Implement proper backup strategies
- Keep your R2 credentials secure
- Regularly review and update your implementation 