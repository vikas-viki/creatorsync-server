import { NestFactory } from '@nestjs/core';
import { MediaServiceModule } from './media-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MediaServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 8001
      }
    }
  );
  console.log("Microservice running on port 8001");
  await app.listen();
}
bootstrap();
