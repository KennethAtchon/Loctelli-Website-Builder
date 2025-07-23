<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Database

The project uses PostgreSQL with Prisma as the ORM. The database schema is defined in `prisma/schema.prisma`.

### Seed Data

Default data for development and testing is stored in `prisma/seed-data/defaults.ts` and seeded via `prisma/seed.ts`. This includes:
- Default admin and user accounts
- Default SubAccount
- Default prompt template
- Default integration templates (GoHighLevel, Facebook Ads, Google Analytics)
- Default strategy and lead

Run `npm run db:seed` to populate the database with default data.

## Database Setup

This project uses Prisma for database management with automatic migrations. The application will automatically run migrations on startup.

### Database Scripts

```bash
# Run migrations (production)
$ npm run db:migrate

# Create and apply new migration (development)
$ npm run db:migrate:dev

# Reset database (development only)
$ npm run db:migrate:reset

# Generate Prisma lead
$ npm run db:generate

# Open Prisma Studio
$ npm run db:studio
```

### Automatic Migrations

The application automatically runs migrations on startup in the following ways:

1. **Application Level**: The `PrismaService` automatically runs `prisma migrate deploy` during module initialization
2. **Container Level**: The Docker container uses a startup script that runs migrations before starting the application
3. **Production Safety**: In production, the application will exit if migrations fail to prevent running with an inconsistent database state

### Connection Retry Logic

The application includes robust retry logic for database and Redis connections:

1. **Database Retry**: The `PrismaService` waits for the database to be available, retrying every 1 second for up to 30 seconds
2. **Redis Retry**: The `RedisService` waits for Redis to be available, retrying every 1 second for up to 30 seconds
3. **Health Checks**: The `/status/health` endpoint provides detailed health status for both database and Redis
4. **Production Safety**: In production, the application will exit if connections fail after max retries

### Health Monitoring

- **GET /status** - Basic application status
- **GET /status/health** - Detailed health check including database and Redis status

### Project Structure

The project follows a modular structure with clear separation of concerns:

```
src/
├── infrastructure/          # Core infrastructure services
│   ├── prisma/             # Database service and module
│   ├── redis/              # Redis service and module
│   ├── config/             # Configuration management
│   └── middleware/         # Custom middleware
├── modules/                # Business logic modules
│   ├── users/              # User management
│   ├── leads/            # Lead management
│   ├── strategies/         # Strategy management
│   ├── bookings/           # Booking management
│   └── chat/               # Chat functionality
├── auth/                   # Authentication and authorization
├── webhooks/               # Webhook handlers
├── status/                 # Health and status endpoints
├── background/             # Background processes
├── ghl/                    # GoHighLevel integration
├── general/                # General utilities
└── core/                   # Application core
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Integrations System (2024-07) - COMPLETE

The integrations system allows subaccounts to connect with external services like GoHighLevel, Facebook, and other platforms. This feature is subaccount-specific and follows a similar pattern to the existing prompt templates system.

### Features
- **Integration Templates**: Pre-configured integration types with setup schemas
- **Dynamic Forms**: Configuration forms generated from JSON schemas
- **Status Management**: Track integration status (active, pending, error, disconnected)
- **Connection Testing**: Test integrations before activation
- **Data Sync**: Synchronize data between systems
- **Complete CRUD**: Full create, read, update, delete operations

### Default Templates
- **GoHighLevel CRM**: Contact and booking synchronization
- **Facebook Advertising**: Campaign tracking and lead attribution  
- **Google Analytics**: Website performance and conversion tracking

### API Endpoints
- `/admin/integration-templates` - Manage integration templates
- `/admin/integrations` - Manage subaccount integrations
- Full CRUD operations with status management and testing

### Frontend Pages
- `/admin/integrations` - Main integrations dashboard
- `/admin/integrations/new` - Setup new integration
- `/admin/integrations/[id]` - Integration details
- `/admin/integrations/[id]/edit` - Edit integration

See `INTEGRATIONS_PLAN.md` for full implementation details.
