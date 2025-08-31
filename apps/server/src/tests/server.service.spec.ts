import { Test, TestingModule } from "@nestjs/testing";
import { ServerService } from "../server.service";
import { PrismaService } from "@creatorsync/prisma/prisma.service";

describe('serverService', () => {
    let service: ServerService;

    let mockPrismaService = {
        feedback: {
            create: jest.fn()
        }
    }

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            providers: [ServerService,
                { provide: PrismaService, useValue: mockPrismaService }
            ]
        }).compile();

        service = module.get(ServerService);
    });

    afterEach(() => {
        jest.resetAllMocks()
    });


    it("should add feature to db if db call working", async () => {
        mockPrismaService.feedback.create.mockResolvedValue({});

        const result = await service.addFeature({} as any, "Good one");

        expect(result).toEqual("Feature request submitted!");
        expect(mockPrismaService.feedback.create).toHaveBeenCalledTimes(1);
    })

    it("should add feature to db if db call is not working", async () => {
        mockPrismaService.feedback.create.mockRejectedValue(new Error());

        const result = await service.addFeature({} as any, "Good one");

        expect(result).toEqual("Couldn't add feature, please try again later");
        expect(mockPrismaService.feedback.create).toHaveBeenCalledTimes(1);
    })

    it("should add feedback to db if db call working", async () => {
        mockPrismaService.feedback.create.mockResolvedValue({});

        const result = await service.addFeedback({} as any, "Good one");

        expect(result).toEqual("Feedback submitted!");
        expect(mockPrismaService.feedback.create).toHaveBeenCalledTimes(1);
    });

    it("should add feedback to db if db call is not working", async () => {
        mockPrismaService.feedback.create.mockRejectedValue(new Error());

        const result = await service.addFeedback({} as any, "Good one");

        expect(result).toEqual("Couldn't add feedback, please try again later");
        expect(mockPrismaService.feedback.create).toHaveBeenCalledTimes(1);
    })
});    