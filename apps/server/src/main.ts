import { NestFactory } from '@nestjs/core';
import { ServerModule } from './server.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }))
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser())
  app.enableCors({
    origin: "http://localhost:5173",
    credentials: true
  })
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
