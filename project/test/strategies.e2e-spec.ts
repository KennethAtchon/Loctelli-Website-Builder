import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('StrategiesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    prismaService = app.get<PrismaService>(PrismaService);
    
    // Clean up database before tests
    await prismaService.strategy.deleteMany({});
    
    await app.init();
  });

  afterAll(async () => {
    // Clean up database after tests
    await prismaService.strategy.deleteMany({});
    await app.close();
  });

  const testStrategy = {
    name: 'Test Strategy',
    description: 'A test strategy for e2e testing'
  };

  let strategyId: number;

  describe('/strategies (POST)', () => {
    it('should create a new strategy', () => {
      return request(app.getHttpServer())
        .post('/strategies')
        .set('x-api-key', process.env.API_KEY)
        .send(testStrategy)
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(testStrategy.name);
          expect(response.body.description).toBe(testStrategy.description);
          
          strategyId = response.body.id;
        });
    });

    it('should not create a strategy with invalid data', () => {
      return request(app.getHttpServer())
        .post('/strategies')
        .set('x-api-key', process.env.API_KEY)
        .send({
          // Missing name
          description: 'Invalid strategy'
        })
        .expect(400);
    });
  });

  describe('/strategies (GET)', () => {
    it('should return all strategies', () => {
      return request(app.getHttpServer())
        .get('/strategies')
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toHaveProperty('id');
          expect(response.body[0]).toHaveProperty('name');
          expect(response.body[0]).toHaveProperty('description');
        });
    });
  });

  describe('/strategies/:id (GET)', () => {
    it('should return a strategy by id', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${strategyId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', strategyId);
          expect(response.body).toHaveProperty('name', testStrategy.name);
          expect(response.body).toHaveProperty('description', testStrategy.description);
        });
    });

    it('should return 404 for non-existent strategy', () => {
      return request(app.getHttpServer())
        .get('/strategies/9999')
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });

  describe('/strategies/:id (PATCH)', () => {
    it('should update a strategy', () => {
      const updatedName = 'Updated Strategy';
      
      return request(app.getHttpServer())
        .patch(`/strategies/${strategyId}`)
        .set('x-api-key', process.env.API_KEY)
        .send({ name: updatedName })
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', strategyId);
          expect(response.body).toHaveProperty('name', updatedName);
          expect(response.body).toHaveProperty('description', testStrategy.description);
        });
    });
  });

  describe('/strategies/:id (DELETE)', () => {
    it('should delete a strategy', () => {
      return request(app.getHttpServer())
        .delete(`/strategies/${strategyId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', strategyId);
        });
    });

    it('should return 404 after strategy is deleted', () => {
      return request(app.getHttpServer())
        .get(`/strategies/${strategyId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });
});
