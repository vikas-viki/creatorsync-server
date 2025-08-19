import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';

@Module({
  providers: [UserService],
  controllers: [],
  exports: [UserService],
  imports: [PrismaModule]
})
export class UserModule { }
