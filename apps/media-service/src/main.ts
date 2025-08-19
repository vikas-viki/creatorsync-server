import { NestFactory } from '@nestjs/core';
import { MediaServiceModule } from './media-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MediaServiceModule,
    {
      transport: Transport.TCP,
      options: {
        port: 3001
      }
    }
  );
  console.log("Microservice running on port 3001");
  await app.listen();
}
bootstrap();
