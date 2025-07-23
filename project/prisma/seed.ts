import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_ADMIN_DATA,
  DEFAULT_USER_DATA,
  DEFAULT_SUBACCOUNT_DATA,
  DEFAULT_PROMPT_TEMPLATE_DATA,
  DEFAULT_STRATEGY_DATA,
  DEFAULT_LEAD_DATA,
  DEFAULT_INTEGRATION_TEMPLATES,
} from './seed-data/defaults';

const prisma = new PrismaClient();

// Get default admin password from environment variable with fallback
const getDefaultAdminPassword = (): string => {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultPassword) {
    console.warn('DEFAULT_ADMIN_PASSWORD environment variable not found, using fallback password');
    return 'defaultAdmin123!CANTUNA';
  }
  return defaultPassword;
};

async function main() {
  console.log('Starting database seed...');

  // Get the first admin user or create one if none exists
  let adminUser = await prisma.adminUser.findFirst();
  
  if (!adminUser) {
    console.log('No admin user found, creating default admin...');
    const defaultPassword = getDefaultAdminPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    adminUser = await prisma.adminUser.create({
      data: {
        ...DEFAULT_ADMIN_DATA,
        password: hashedPassword,
      },
    });
    
    console.log(`Default admin created with email: ${DEFAULT_ADMIN_DATA.email}`);
    console.log('Default password: ' + defaultPassword);
  }

  // Create default SubAccount if it doesn't exist
  let defaultSubAccount = await prisma.subAccount.findFirst({
    where: { name: DEFAULT_SUBACCOUNT_DATA.name }
  });

  if (!defaultSubAccount) {
    console.log('Creating default SubAccount...');
    defaultSubAccount = await prisma.subAccount.create({
      data: {
        ...DEFAULT_SUBACCOUNT_DATA,
        createdByAdminId: adminUser.id,
      },
    });
    console.log('Default SubAccount created successfully');
  } else {
    console.log('Default SubAccount already exists');
  }

  // Check if any prompt template exists
  const existingTemplate = await prisma.promptTemplate.findFirst();

  if (!existingTemplate) {
    console.log('Creating default prompt template...');
    
    await prisma.promptTemplate.create({
      data: {
        ...DEFAULT_PROMPT_TEMPLATE_DATA,
        createdByAdminId: adminUser.id,
      },
    });
    
    console.log('Default prompt template created successfully');
  } else {
    console.log('Default prompt template already exists');
  }

  // Check if any integration templates exist
  const existingIntegrationTemplate = await prisma.integrationTemplate.findFirst();

  if (!existingIntegrationTemplate) {
    console.log('Creating default integration templates...');
    
    for (const templateData of DEFAULT_INTEGRATION_TEMPLATES) {
      await prisma.integrationTemplate.create({
        data: {
          ...templateData,
          createdByAdminId: adminUser.id,
        },
      });
    }
    
    console.log('Default integration templates created successfully');
  } else {
    console.log('Default integration templates already exist');
  }

  // Create a default user if none exists
  let defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.log('Creating default user...');
    const defaultPassword = getDefaultAdminPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    defaultUser = await prisma.user.create({
      data: {
        ...DEFAULT_USER_DATA,
        password: hashedPassword,
        subAccountId: defaultSubAccount.id,
        createdByAdminId: adminUser.id,
      },
    });
    
    console.log(`Default user created with email: ${DEFAULT_USER_DATA.email}`);
    console.log('Default password: ' + defaultPassword);
  } else {
    console.log('Default user already exists');
  }

  // Create a default strategy if none exists
  const existingStrategy = await prisma.strategy.findFirst();
  if (!existingStrategy) {
    console.log('Creating default strategy...');
    
    const defaultTemplate = await prisma.promptTemplate.findFirst({
      where: { isActive: true }
    });
    
    if (!defaultTemplate) {
      console.log('No active prompt template found, skipping strategy creation');
    } else {
      await prisma.strategy.create({
        data: {
          ...DEFAULT_STRATEGY_DATA,
          userId: defaultUser.id,
          subAccountId: defaultSubAccount.id,
          promptTemplateId: defaultTemplate.id,
        },
      });
      
      console.log('Default strategy created successfully');
    }
  } else {
    console.log('Default strategy already exists');
  }

  // Create a default lead if none exists
  const existingLead = await prisma.lead.findFirst();
  if (!existingLead) {
    console.log('Creating default lead...');
    
    const defaultStrategy = await prisma.strategy.findFirst();
    
    if (!defaultStrategy) {
      console.log('No strategy found, skipping lead creation');
    } else {
      await prisma.lead.create({
        data: {
          ...DEFAULT_LEAD_DATA,
          userId: defaultUser.id,
          strategyId: defaultStrategy.id,
          subAccountId: defaultSubAccount.id,
        },
      });
      
      console.log('Default lead created successfully');
    }
  } else {
    console.log('Default lead already exists');
  }

  console.log('Database seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 