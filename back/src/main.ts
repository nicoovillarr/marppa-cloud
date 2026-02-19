import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './modules/shared/infrastructure/http/all-exceptions.filter';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

function generateDbCert() {
  const { DB_CA, DB_CA_ROUTE = './certs/db.pem' } = process.env;

  if (!DB_CA) return;

  const caPath = path.resolve(process.cwd(), DB_CA_ROUTE);
  const dir = path.dirname(caPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(caPath, DB_CA.replace(/\\n/g, '\n'));
}

async function bootstrap() {
  generateDbCert();

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
