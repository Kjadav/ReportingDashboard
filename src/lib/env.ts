// Environment configuration with validation

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ads_analytics',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/oauth/google/callback',
  
  // Google Ads
  GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  
  // URLs
  API_URL: process.env.API_URL || 'http://localhost:4000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'development-encryption-key-32bytes',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Ports
  API_PORT: parseInt(process.env.API_PORT || '4000', 10),
} as const;

// Validate required environment variables in production
export function validateEnv(): void {
  if (env.NODE_ENV === 'production') {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'ENCRYPTION_KEY',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT_SECRET length
    if (env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate ENCRYPTION_KEY length
    if (env.ENCRYPTION_KEY.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }
}

export default env;

