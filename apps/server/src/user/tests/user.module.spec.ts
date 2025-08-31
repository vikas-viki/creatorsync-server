import { Test, TestingModule } from "@nestjs/testing";
import { UserModule } from "../user.module";
import { UserService } from "../user.service";
import { PrismaModule } from "@creatorsync/prisma/prisma.module";

describe('userModule', () => {
    let module: UserModule;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [{ provide: UserService, useValue: {} }],
            imports: [
                PrismaModule,
                UserModule
            ]
        }).compile();

        module = moduleRef.get(UserModule);
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    })
})