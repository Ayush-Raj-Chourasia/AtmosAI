import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Environment-based CORS configuration
  // const allowedOrigins = process.env.NODE_ENV === 'production'
  //   ? process.env.ALLOWED_ORIGIN?.split(',') || ['https://disaster-pulse.denyherianto.com/']
  //   : [
  //     'http://localhost:3000',
  //     'http://localhost:3001',
  //     /^http:\/\/localhost:\d+$/,
  //     /^http:\/\/127\.0\.0\.1:\d+$/,
  //   ];

  // app.enableCors({
  //   origin: allowedOrigins,
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  // });

  // Global validation pipe for input sanitization
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  app.enableCors();
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
