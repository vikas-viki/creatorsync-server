import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule), PrismaModule],
  exports: [ChatService]
})
export class ChatModule { }
