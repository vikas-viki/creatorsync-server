import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "../auth.module";


describe('authModule', () => {
    let module = AuthModule;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AuthModule],
        }).compile();

        module = moduleRef.get(AuthModule)
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    })
});