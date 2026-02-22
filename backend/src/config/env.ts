export const env = {
  PORT: process.env.PORT || '3001',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '10d',
  OPHIM_API_URL: process.env.OPHIM_API_URL || 'https://ophim17.cc',
};
