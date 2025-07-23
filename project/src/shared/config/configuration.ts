export default () => ({
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10) || 0,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '180000', 10) || 3 * 60000, // 3 minutes default
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10) || 100,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },
  api: {
    key: process.env.API_KEY,
  },
  admin: {
    authCode: process.env.ADMIN_AUTH_CODE,
    defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD,
  },
  cors: {
    origins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [
      'http://localhost:3000',
      'http://loctelli_frontend:3000',
      'http://frontend:3000',
      'http://loctelli.com',
    ],
  },
  // R2 Storage Configuration
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
    enabled: process.env.R2_ENABLED === 'true' || true,
  },
}); 