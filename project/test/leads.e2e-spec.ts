import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('LeadsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userId: number;
  let strategyId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    prismaService = app.get<PrismaService>(PrismaService);
    
    // Clean up database before tests
    await prismaService.lead.deleteMany({});
    
    // Create a test user and strategy for foreign key relationships
    const user = await prismaService.user.create({
      data: {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123'
      }
    });
    userId = user.id;
    
    const strategy = await prismaService.strategy.create({
      data: {
        name: 'Test Strategy',
        description: 'Test strategy description'
      }
    });
    strategyId = strategy.id;
    
    await app.init();
  });

  afterAll(async () => {
    // Clean up database after tests
    await prismaService.lead.deleteMany({});
    await prismaService.strategy.deleteMany({});
    await prismaService.user.deleteMany({});
    await app.close();
  });

  const testLead = {
    name: 'Test Lead',
    userId: null, // Will be set in beforeEach
    strategyId: null, // Will be set in beforeEach
    email: 'lead@example.com',
    phone: '123-456-7890',
    company: 'Test Company',
    position: 'CEO',
    notes: 'Test notes'
  };

  let leadId: number;

  beforeEach(() => {
    testLead.userId = userId;
    testLead.strategyId = strategyId;
  });

  describe('/leads (POST)', () => {
    it('should create a new lead', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .set('x-api-key', process.env.API_KEY)
        .send(testLead)
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(testLead.name);
          expect(response.body.email).toBe(testLead.email);
          expect(response.body.userId).toBe(userId);
          expect(response.body.strategyId).toBe(strategyId);
          
          leadId = response.body.id;
        });
    });

    it('should not create a lead with invalid data', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .set('x-api-key', process.env.API_KEY)
        .send({
          // Missing required fields
          email: 'invalid@example.com'
        })
        .expect(400);
    });
  });

  describe('/leads (GET)', () => {
    it('should return all leads', () => {
      return request(app.getHttpServer())
        .get('/leads')
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('id');
          expect(response.body[0]).toHaveProperty('name');
          expect(response.body[0]).toHaveProperty('email');
        });
    });
  });

  describe('/leads/:id (GET)', () => {
    it('should return a lead by id', () => {
      return request(app.getHttpServer())
        .get(`/leads/${leadId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', leadId);
          expect(response.body).toHaveProperty('name', testLead.name);
          expect(response.body).toHaveProperty('email', testLead.email);
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('strategy');
        });
    });

    it('should return 404 for non-existent lead', () => {
      return request(app.getHttpServer())
        .get('/leads/9999')
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });

  describe('/leads/user/:userId (GET)', () => {
    it('should return leads for a specific user', () => {
      return request(app.getHttpServer())
        .get(`/leads/user/${userId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('userId', userId);
        });
    });
  });

  describe('/leads/:id (PATCH)', () => {
    it('should update a lead', () => {
      const updatedName = 'Updated Lead';
      
      return request(app.getHttpServer())
        .patch(`/leads/${leadId}`)
        .set('x-api-key', process.env.API_KEY)
        .send({ name: updatedName })
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', leadId);
          expect(response.body).toHaveProperty('name', updatedName);
          expect(response.body).toHaveProperty('email', testLead.email);
        });
    });
  });

  describe('/leads/:id (DELETE)', () => {
    it('should delete a lead', () => {
      return request(app.getHttpServer())
        .delete(`/leads/${leadId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', leadId);
        });
    });

    it('should return 404 after lead is deleted', () => {
      return request(app.getHttpServer())
        .get(`/leads/${leadId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });
});
