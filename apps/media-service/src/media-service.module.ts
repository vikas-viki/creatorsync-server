import { Module } from '@nestjs/common';
import { MediaServiceController } from './media-service.controller';
import { MediaServiceService } from './media-service.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [MediaServiceController],
  providers: [MediaServiceService],
})
export class MediaServiceModule { }
