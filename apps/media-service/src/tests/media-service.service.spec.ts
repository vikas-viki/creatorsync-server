import { Test, TestingModule } from "@nestjs/testing";
import { MediaServiceService } from "../media-service.service"
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@creatorsync/prisma/prisma.service";

describe('media-service service', () => {
    let service: MediaServiceService;

    let mockPrisma = {
        user: {
            update: jest.fn(),
            findUnique: jest.fn()
        },
        videoRequest: {
            findFirst: jest.fn()
        }
    };
    let mockgoogleOauthClient = {
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn()
    }

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            providers: [
                MediaServiceService,
                ConfigService,
                { provide: PrismaService, useValue: mockPrisma }
            ]
        }).compile();

        service = module.get(MediaServiceService);
        (service as any).googleOauthClient = mockgoogleOauthClient;
    });

    afterEach(() => {
        jest.resetAllMocks();
    })

    it('should be defined', () => {
        expect(service).toBeDefined();
    })

    it('should return youtube auth link', async () => {
        mockgoogleOauthClient.generateAuthUrl.mockReturnValue("https://auth.google.com");
        const result = service.getYoutubeAuthLink();

        expect(result).toEqual("https://auth.google.com");
    });

    it('should fail to update youtube credentials if any of 3 required tokes are missing', async () => {
        mockgoogleOauthClient.getToken.mockResolvedValue(
            {
                tokens: {
                    refresh_toke: null,
                    access_token: "2334234",
                    expiry_date: new Date()
                }
            }
        );

        const result = await service.updateYoutbeCredentials("123233", "23432");

        expect(result).toEqual("MISSING_TOKENS");
        expect(mockgoogleOauthClient.getToken).toHaveBeenCalledTimes(1);
    });

    it('should work fine if all the tokens are being fetched correctly', async () => {
        mockgoogleOauthClient.getToken.mockResolvedValue(
            {
                tokens: {
                    refresh_token: "324234",
                    access_token: "2334234",
                    expiry_date: new Date()
                }
            }
        );
        mockPrisma.user.update.mockResolvedValue(true);

        const result = await service.updateYoutbeCredentials("123233", "23432");

        expect(result).toEqual("OKAY");
        expect(mockgoogleOauthClient.getToken).toHaveBeenCalledTimes(1);
    });

    it('should fail to upload video request to youtube if videorequest doesnot exists', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(true);
        mockPrisma.videoRequest.findFirst.mockResolvedValue(null);

        const result = await service.uploadVideoRequestToYoutube("123", "123");

        expect(result).toBeUndefined();
    });

    it('should refresh YT credentials, if youtube credentials are not correct or expired', async () => {
        mockgoogleOauthClient.setCredentials.mockResolvedValue(true);

        let result = await service.authYoutube("234323", "sdasdfd", new Date(), "swevasdf", "asdfasea");

    });

    it('should fail to upload video request to youtube if youtube credentilas are wrong', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            youtubeAccessToken: "1234",
            youtubeRefreshToken: "5433",
            youtubeExpiresAt: new Date()
        });
        mockPrisma.videoRequest.findFirst.mockResolvedValue({
            video: "https://s3.aws.amazon.com...",
            title: "this is a video",
            description: "this is a description",
            thumbnailKey: "https://s3.aws.amazon.com"
        });

        const result = await service.uploadVideoRequestToYoutube("123", "123");

        expect(result).toBeUndefined();
    });
})