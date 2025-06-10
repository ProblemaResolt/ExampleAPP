const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance and reuse it
const prisma = new PrismaClient();

// Ensure prisma is connected
prisma.$connect()
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    throw error;
  });

// Handle cleanup on app shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma; 