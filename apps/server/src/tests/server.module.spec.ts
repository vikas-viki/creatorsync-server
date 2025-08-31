import { Test, TestingModule } from "@nestjs/testing";
import { ServerModule } from "../server.module";
import { ServerService } from "../server.service";
import { ServerController } from "../server.controller";
import { PrismaModule } from "@creatorsync/prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "../auth/auth.controller";
import { AuthModule } from "../auth/auth.module";
import { AuthService } from "../auth/auth.service";
import { ChatModule } from "../chat/chat.module";
import { UserModule } from "../user/user.module";

describe('serverModule', () => {
    let module: ServerModule;

    beforeEach(async () => {
        let moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                ServerModule,
                ConfigModule,
                PrismaModule,
                UserModule,
                AuthModule,
                ChatModule
            ],
            controllers: [ServerController, AuthController],
            providers: [ServerService, AuthService],
        }).compile();

        module = moduleRef.get(ServerModule);
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    })
});