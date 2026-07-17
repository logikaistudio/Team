import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'epcs_local',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_access_token_key_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_token_key_change_me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    bucketName: process.env.S3_BUCKET_NAME || 'epcs-assets',
  },
  whatsapp: {
    url: process.env.WHATSAPP_API_URL || '',
    token: process.env.WHATSAPP_API_TOKEN || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@epcs-saas.com',
  },
  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
  }
};
