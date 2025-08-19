import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "./guards/jwt.guard";

@Global()
@Module({
    exports: [PrismaService, JwtAuthGuard],
    providers: [PrismaService, JwtAuthGuard],
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>("JWT_SECRET"),
                signOptions: { expiresIn: '1d' },
            }),
        })
    ]
})
export class PrismaModule {

}