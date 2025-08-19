import { Module } from '@nestjs/common';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { UserModule } from './user/user.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    PrismaModule, UserModule, AuthModule, ChatModule],
  controllers: [ServerController, AuthController],
  providers: [ServerService, AuthService],
})
export class ServerModule {}
