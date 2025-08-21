import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@creatorsync/prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
        forwardRef(() => UserModule),
        PrismaModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>("JWT_SECRET"),
                signOptions: { expiresIn: '1d' },
            }),
        }),
        ClientsModule.register([
            {
                name: "MEDIA_SERVICE",
                transport: Transport.TCP,
                options: { host: 'localhost', port: 3001 }
            }
        ])
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [JwtModule, AuthService, ClientsModule]
})
export class AuthModule { }
