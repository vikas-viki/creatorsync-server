import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [
    ClientsModule.register([
      {
        name: "MEDIA_SERVICE",
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 }
      }
    ]),
    forwardRef(() => AuthModule), forwardRef(() => UserModule), PrismaModule],
  exports: [ChatService]
})
export class ChatModule { }
