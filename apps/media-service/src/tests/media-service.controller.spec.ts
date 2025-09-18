import { Test, TestingModule } from "@nestjs/testing";
import { MediaServiceController } from "../media-service.controller"
import { MediaServiceService } from "../media-service.service";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";

describe('media-service controller', () => {
    let controller: MediaServiceController;

    let mockMediaService = {
        getSignedUrlForUpload: jest.fn(),
        getSignedUrlForView: jest.fn(),
        retryVideoRequestUpload: jest.fn(),
        uploadVideoRequestToYoutube: jest.fn(),
        getYoutubeAuthLink: jest.fn(),
        updateYoutbeCredentials: jest.fn()
    };

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            controllers: [MediaServiceController],
            providers: [
                { provide: MediaServiceService, useValue: mockMediaService }
            ]
        }).compile();

        controller = module.get(MediaServiceController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return signed url for upload', async () => {
        let data: PresignedPost = {
            url: "https://s3.aws.com/...",
            fields: {}
        }
        mockMediaService.getSignedUrlForUpload.mockResolvedValue(data);

        const result = await controller.getSignedUrlForUpload({ key: "image", contentType: 'image/png' });

        expect(result).toEqual(data);
        expect(mockMediaService.getSignedUrlForUpload).toHaveBeenCalledTimes(1);
        expect(mockMediaService.getSignedUrlForUpload).toHaveBeenCalledWith("image", "image/png");
    });

    it("should return signed urls for multiple keys", async () => {
        let param = ["image", "video", "video-request"];
        let data = {
            "image": "https://s3.aws.com/...",
            "video": "https://s3.aws.com/...",
            "video-request": "https://s3.aws.com/..."
        };

        mockMediaService.getSignedUrlForView.mockResolvedValue(data);
        const result = await controller.getSignedUrlForView({ keys: param });

        expect(result).toEqual(data);
        expect(mockMediaService.getSignedUrlForView).toHaveBeenCalledTimes(1);
        expect(mockMediaService.getSignedUrlForView).toHaveBeenCalledWith(param);
    });

    it('should retry uploading video request', async () => {
        const result = await controller.retryVideoRequestUpload({ videoRequestId: "video-req-id", userId: "user-id-123" });

        expect(result).toBeUndefined();
        expect(mockMediaService.retryVideoRequestUpload).toHaveBeenCalledTimes(1);
        expect(mockMediaService.retryVideoRequestUpload).toHaveBeenCalledWith("video-req-id", "user-id-123");
    });

    it('should start uploading video request on approval', async () => {
        mockMediaService.uploadVideoRequestToYoutube.mockResolvedValue({ id: "youtube video id" });

        const result = await controller.uploadApprovedVideoRequest({ userId: "user-123", videoRequestId: "video-request-123" });

        expect(result).toEqual({ id: "youtube video id" });
        expect(mockMediaService.uploadVideoRequestToYoutube).toHaveBeenCalledTimes(1);
        expect(mockMediaService.uploadVideoRequestToYoutube).toHaveBeenCalledWith("user-123", "video-request-123");
    });

    it('should return youtube auth link', async () => {
        mockMediaService.getYoutubeAuthLink.mockReturnValue("https://auth.google.com...");

        const result = controller.getYoutubeAuthLink();

        expect(result).toEqual("https://auth.google.com...");
    });

    it("shoudl update youtube creadentails of user", async () => {
        mockMediaService.updateYoutbeCredentials.mockResolvedValue("OKAY");
        let data = { code: "23skd2-234as-234sadkn", userId: "user-123" };
        const result = await controller.updateYoutubeCredentials({ code: "23skd2-234as-234sadkn", userId: "user-123" });

        expect(result).toEqual("OKAY");
        expect(mockMediaService.updateYoutbeCredentials).toHaveBeenCalledTimes(1);
        expect(mockMediaService.updateYoutbeCredentials).toHaveBeenCalledWith(data.code, data.userId);
    });
})