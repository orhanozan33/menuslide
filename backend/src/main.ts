import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Stripe webhook needs raw body for signature verification
  });
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  const corsOrigin = configService.get('CORS_ORIGIN') || 'http://localhost:3000';

  // Body size limit: 100MB (large video/image uploads)
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  // Enable CORS - allow frontend origins (production: menuslide.com)
  const allowedOrigins = [
    corsOrigin,
    'https://menuslide.com',
    'https://www.menuslide.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vercel preview (*.vercel.app)
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
      // Development: allow localhost and 127.0.0.1 on any port
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Request logging (dev only)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (req.url?.includes('create-menu-from-products')) {
        console.log(`[MIDDLEWARE] ${req.method} ${req.url}`);
      }
      next();
    });
  }

  // Stripe webhook route uses raw body (handled in controller)

  await app.listen(port);
  console.log(`🚀 Backend server running on http://localhost:${port}`);
}

bootstrap();
