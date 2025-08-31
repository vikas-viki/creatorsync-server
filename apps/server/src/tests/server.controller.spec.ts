import { Test, TestingModule } from "@nestjs/testing";
import { ServerController } from "../server.controller";
import { ServerService } from "../server.service";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";

describe('serverController', () => {
    let controller: ServerController;

    let mockServerService = {
        addFeature: jest.fn(),
        addFeedback: jest.fn()
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServerController],
            providers: [
                { provide: ServerService, useValue: mockServerService }
            ]
        }).overrideGuard(JwtAuthGuard).useValue({
            canActivate: () => true
        }).compile();

        controller = module.get(ServerController);
    });

    afterEach(() => {
        jest.resetAllMocks()
    })

    it('should call feedback fn if user provided a feedback request', async () => {
        mockServerService.addFeedback.mockResolvedValue("Feedback submitted!")
        const req = {
            user: {
                id: "123",
                username: "user",
                type: "CREATOR",
                isYoutubeConnected: false
            }
        };


        const result = await controller.addFeedback("feedback", req as any, { feedback: "Good one!" });

        expect(result).toEqual("Feedback submitted!");
        expect(mockServerService.addFeedback).toHaveBeenCalledTimes(1);
        expect(mockServerService.addFeedback).toHaveBeenCalledWith(req.user, "Good one!");
        expect(mockServerService.addFeature).toHaveBeenCalledTimes(0);
    });

    it('should call feature fn if user provided a feature request', async () => {
        mockServerService.addFeature.mockResolvedValue("Feature request submitted!")
        const req = {
            user: {
                id: "123",
                username: "user",
                type: "CREATOR",
                isYoutubeConnected: false
            }
        };

        const result = await controller.addFeedback("feature", req as any, { feedback: "Good one!" });

        expect(result).toEqual("Feature request submitted!");
        expect(mockServerService.addFeature).toHaveBeenCalledTimes(1);
        expect(mockServerService.addFeature).toHaveBeenCalledWith(req.user, "Good one!");
        expect(mockServerService.addFeedback).toHaveBeenCalledTimes(0);
    });
});