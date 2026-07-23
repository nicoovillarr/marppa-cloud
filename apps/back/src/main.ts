import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './modules/shared/infrastructure/http/all-exceptions.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const {
    CORS_URL,
    PORT,
  } = process.env;

  const app = await NestFactory.create(AppModule);

  // Without this the class-validator decorators on every DTO are inert: bad
  // input reaches the domain (and the cloud-scripts processors) unchecked.
  // `transform` also runs the @Transform hooks the DTOs rely on.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());

  if (CORS_URL) {
    const origins = CORS_URL.split(',').map((url) => url.trim());
    app.enableCors({
      origin: origins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  }

  await app.listen(PORT ?? 3000);
}
bootstrap();
