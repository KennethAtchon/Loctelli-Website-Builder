import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
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
    await prismaService.user.deleteMany({});
    
    await app.init();
  });

  afterAll(async () => {
    // Clean up database after tests
    await prismaService.user.deleteMany({});
    await app.close();
  });

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  let userId: number;

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('x-api-key', process.env.API_KEY)
        .send(testUser)
        .expect(201)
        .then(response => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe(testUser.name);
          expect(response.body.email).toBe(testUser.email);
          expect(response.body).not.toHaveProperty('password'); // Password should not be returned
          
          userId = response.body.id;
        });
    });

    it('should not create a user with invalid data', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('x-api-key', process.env.API_KEY)
        .send({
          name: 'Invalid User',
          // Missing email
          password: 'password123'
        })
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return all users', () => {
      return request(app.getHttpServer())
        .get('/users')
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

  describe('/users/:id (GET)', () => {
    it('should return a user by id', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', userId);
          expect(response.body).toHaveProperty('name', testUser.name);
          expect(response.body).toHaveProperty('email', testUser.email);
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/9999')
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update a user', () => {
      const updatedName = 'Updated User';
      
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('x-api-key', process.env.API_KEY)
        .send({ name: updatedName })
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', userId);
          expect(response.body).toHaveProperty('name', updatedName);
          expect(response.body).toHaveProperty('email', testUser.email);
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete a user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(200)
        .then(response => {
          expect(response.body).toHaveProperty('id', userId);
        });
    });

    it('should return 404 after user is deleted', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('x-api-key', process.env.API_KEY)
        .expect(404);
    });
  });
});
