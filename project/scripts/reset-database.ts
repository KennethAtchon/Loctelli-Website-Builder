import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Resetting database...');
  
  try {
    // Delete all data from all tables
    await prisma.websiteChange.deleteMany();
    await prisma.websiteFile.deleteMany();
    await prisma.website.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.integrationTemplate.deleteMany();
    await prisma.promptTemplate.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.strategy.deleteMany();
    await prisma.user.deleteMany();
    await prisma.subAccount.deleteMany();
    await prisma.adminUser.deleteMany();
    
    console.log('✅ Database reset completed successfully');
    console.log('📊 All tables are now empty and ready for R2 storage');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('🎉 Database reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  }); 