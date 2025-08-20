import { Module, forwardRef } from '@nestjs/common';
import { MediaServiceController } from './media-service.controller';
import { MediaServiceService } from './media-service.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), forwardRef(() => PrismaModule)],
  controllers: [MediaServiceController],
  providers: [MediaServiceService],
})
export class MediaServiceModule { }
