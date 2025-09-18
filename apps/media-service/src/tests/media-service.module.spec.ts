import { Test, TestingModule } from "@nestjs/testing";
import { MediaServiceModule } from "../media-service.module"
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@creatorsync/prisma/prisma.module";
import { MediaServiceController } from "../media-service.controller";
import { MediaServiceService } from "../media-service.service";

describe('module', () => {
    let module: MediaServiceModule;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule, PrismaModule, MediaServiceModule],
            controllers: [MediaServiceController],
            providers: [MediaServiceService]
        }).compile();

        module = moduleRef.get(MediaServiceModule);
    })

    it('should be defined', () => {
        expect(module).toBeDefined();
    })
})