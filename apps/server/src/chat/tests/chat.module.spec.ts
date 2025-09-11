import { Test, TestingModule } from "@nestjs/testing";
import { ChatModule } from "../chat.module";
import { ChatController } from "../chat.controller";
import { ChatService } from "../chat.service";
import { ClientsModule } from "@nestjs/microservices";
import { AuthModule } from "../../auth/auth.module";
import { UserModule } from "../../user/user.module";
import { PrismaModule } from "@creatorsync/prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";

describe('chatModule', () => {
    let module: ChatModule;

    beforeEach(async () => {
        let moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                ChatModule,
                ClientsModule,
                AuthModule,
                UserModule,
                ConfigModule.forRoot({ isGlobal: true }),
                PrismaModule
            ],
            controllers: [ChatController],
            providers: [ChatService],
            exports: [ChatService]
        }).compile();


        module = moduleRef.get(ChatModule);
    })

    it('should be defined', () => {
        expect(module).toBeDefined();
    })
});    