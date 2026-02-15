import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './modules/shared/infrastructure/http/all-exceptions.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());

  const corsUrl = process.env.CORS_URL;
  if (corsUrl) {
    const origins = corsUrl.split(',').map((url) => url.trim());
    app.enableCors({
      origin: origins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
