// Mock environment variables for all tests
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_pass';
process.env.DB_HOST = 'localhost';
process.env.UPLOADS_DIR = './test-uploads';
