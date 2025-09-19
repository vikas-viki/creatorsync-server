import { Test, TestingModule } from "@nestjs/testing";
import { MediaServiceService } from "../media-service.service"
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@creatorsync/prisma/prisma.service";
import { google } from "googleapis";
import * as aws_sdk_signer from "@aws-sdk/s3-presigned-post"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ProgressStream } from "progress-stream";
import EventEmitter from "events";

jest.mock('googleapis');
jest.mock("@aws-sdk/s3-presigned-post", () => ({
    createPresignedPost: jest.fn()
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn()
}))

describe('media-service service', () => {
    let service: MediaServiceService;

    let mockPrisma = {
        user: {
            update: jest.fn(),
            findUnique: jest.fn()
        },
        videoRequest: {
            findFirst: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn()
        }
    };
    let mockS3 = {
        send: jest.fn()
    }
    let mockRedis = {
        publish: jest.fn()
    }
    let mockConfigService = {
        get: jest.fn()
    }
    let mockgoogleOauthClient = {
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
        credentials: {
            expiry_date: new Date()
        }
    }

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            providers: [
                MediaServiceService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: PrismaService, useValue: mockPrisma }
            ]
        }).compile();

        service = module.get(MediaServiceService);
        (service as any).googleOauthClient = mockgoogleOauthClient;
        (service as any).s3 = mockS3;
        (service as any).redis = mockRedis;
    });

    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    })

    it('should be defined', () => {
        expect(service).toBeDefined();
    })

    it('should init s3 on init', () => {
        expect(service.onModuleInit()).toBeUndefined();
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
        let data = { upload: "dsfsdf" };

        mockgoogleOauthClient.setCredentials.mockResolvedValue(true);
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockReturnValue(data);

        let result = await service.authYoutube("234323", "sdasdfd", new Date(), "swevasdf", "asdfasea");
        expect(result).toEqual(data);
    });

    it('should reset YT credentials, if any error occurs', async () => {
        mockgoogleOauthClient.setCredentials.mockResolvedValue(true);
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockImplementation(() => {
            throw new Error("Inside google.youtube");
        });
        mockPrisma.user.update.mockResolvedValue(true);
        mockPrisma.videoRequest.update.mockResolvedValue(true);

        let result = await service.authYoutube("234323", "sdasdfd", new Date(), "swevasdf", "asdfasea");
        expect(result).toBeUndefined()
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
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockImplementation(() => {
            throw new Error("Inside google.youtube");
        });

        const result = await service.uploadVideoRequestToYoutube("123", "123");

        expect(result).toBeUndefined();
    });

    it('should fail to upload video request to youtube if video uploading to youtube fails (or anything related)', async () => {
        let mockYoutube = {
            videos: {
                insert: jest.fn(),
                update: jest.fn()
            }
        };
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
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockReturnValue(mockYoutube);
        mockS3.send.mockResolvedValue({
            head: {
                ContentLength: 12345,
                Body: new ReadableStream()
            }
        });
        mockYoutube.videos.insert.mockImplementation(() => {
            throw new Error("Inside video insert");
        })
        const result = await service.uploadVideoRequestToYoutube("123", "123");

        expect(result).toBeUndefined();
    });

    it('should throw if videoId from youtube video upload is not found', async () => {
        let mockYoutube = {
            videos: {
                insert: jest.fn(),
                update: jest.fn()
            }
        };
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
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockReturnValue(mockYoutube);
        mockS3.send.mockResolvedValue({
            ContentLength: 12345,
            Body: {
                pipe: jest.fn()
            }
        });
        mockYoutube.videos.insert.mockResolvedValue({
            data: {
                id: undefined
            }
        })
        // cause if uploading thumbain fails, it returns data from uploading video
        expect(await service.uploadVideoRequestToYoutube("123", "123"))
            .toEqual({ id: undefined });
        expect(mockPrisma.videoRequest.update).toHaveBeenCalledTimes(2);
    });

    it('video & thumbnail uploading should work fine if every check passes', async () => {
        let mockYoutube = {
            videos: {
                insert: jest.fn(),
                update: jest.fn()
            },
            thumbnails: {
                set: jest.fn()
            }
        };
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
        mockgoogleOauthClient.refreshAccessToken.mockResolvedValue({
            credentials: {
                access_token: "234",
                expiry_date: new Date()
            }
        });
        (google.youtube as jest.Mock).mockReturnValue(mockYoutube);

        let mockData = {
            ContentLength: 12345,
            Body: {
                pipe: jest.fn()
            }
        };
        mockData.Body.pipe.mockImplementation((videoProgressStream: ProgressStream) => {
            videoProgressStream.emit('progress', { percentage: 45.45 })
        })
        mockS3.send.mockResolvedValue(mockData);
        mockYoutube.videos.insert.mockResolvedValue({
            data: {
                id: "2432"
            }
        })

        // cause if uploading thumbain fails, it returns data from uploading video
        expect(await service.uploadVideoRequestToYoutube("123", "123"))
            .toEqual({ id: "2432" });
        expect(mockPrisma.videoRequest.update).toHaveBeenCalledTimes(2);
    });

    it('should return correct signed url for upload', async () => {
        let data = {
            url: "https://s2.aws.amazon.com",
            fields: { key: 'mocked-key' }
        };
        (aws_sdk_signer.createPresignedPost as jest.Mock).mockResolvedValue(data);

        let result = await service.getSignedUrlForUpload("123", "image/png");
        expect(result).toEqual(data);
    });

    it('should return signedurls for view', async () => {
        let keys = ["k1", "k2", "k3", "k4"];
        let value = "https://s3_signed_url";

        mockConfigService.get.mockReturnValue("S3_BUCKET");
        (getSignedUrl as jest.Mock).mockResolvedValue(value);

        const result = await service.getSignedUrlForView(keys);
        let data = Object.fromEntries(keys.map(k => {
            if (k.length == 0) {
                return [k, ""];
            } else {
                return [k, value];
            }
        }));

        expect(result).toEqual(data);
    });

    it('should return empty signedurls if any error occurs', async () => {
        let keys = ["", "k2", "k3", "k4"];

        mockConfigService.get.mockReturnValue("S3_BUCKET");
        (getSignedUrl as jest.Mock).mockImplementation(() => {
            throw new Error("Error inside getSignedUrl");
        })

        const result = await service.getSignedUrlForView(keys);
        let data = Object.fromEntries(keys.map(k => {
            return [k, ""];
        }));

        expect(result).toEqual(data);
    });

    it("should fail to retry upload if user/youtube credentials are not found", async () => {
        mockPrisma.videoRequest.findUnique.mockResolvedValue({ id: "2323" })
        mockPrisma.user.findUnique.mockResolvedValue({
            id: "2323",
            youtubeAccessToken: "sadg423",
            youtubeExpiresAt: new Date()
        })

        expect(await service.retryVideoRequestUpload("2323", "2323")).toBeUndefined()
    });

    it('should re-upload entire video-request to youtube if it was failed in initial step', async () => {
        jest.spyOn(service, 'uploadVideoToYouTube').mockResolvedValue({ "id": "123" });

        mockPrisma.videoRequest.findUnique.mockResolvedValue({
            id: "2323",
            uploadStatus: "UPLOAD_STARTED"
        })
        mockPrisma.user.findUnique.mockResolvedValue({
            id: "2323",
            youtubeAccessToken: "sadg423",
            youtubeExpiresAt: new Date(),
            youtubeRefreshToken: "sasdfasd"
        })

        expect(await service.retryVideoRequestUpload("2323", "2323")).toEqual({ "id": "123" });
        expect(service.uploadVideoToYouTube).toHaveBeenCalledTimes(1);
    })

    it('should fail to re-upload entire video-request to youtube if video was uploaded but videoId is not found', async () => {
        jest.spyOn(service, 'uploadVideoToYouTube').mockResolvedValue({ "id": "123" });

        mockPrisma.videoRequest.findUnique.mockResolvedValue({
            id: "2323",
            uploadStatus: "VIDEO_UPLOADED"
        })
        mockPrisma.user.findUnique.mockResolvedValue({
            id: "2323",
            youtubeAccessToken: "sadg423",
            youtubeExpiresAt: new Date(),
            youtubeRefreshToken: "sasdfasd"
        })

        expect(await service.retryVideoRequestUpload("2323", "2323")).toBeUndefined();
    })

    it('should fail to re-upload entire video-request to youtube if video was uploaded but videoId is not found', async () => {
        jest.spyOn(service, 'authYoutube').mockResolvedValue({} as any);
        jest.spyOn(service, 'uploadThumbnail').mockResolvedValue({} as any);

        mockPrisma.videoRequest.findUnique.mockResolvedValue({
            id: "2323",
            uploadStatus: "VIDEO_UPLOADED",
            youtubeVideoId: "1234"
        })
        mockPrisma.user.findUnique.mockResolvedValue({
            id: "2323",
            youtubeAccessToken: "sadg423",
            youtubeExpiresAt: new Date(),
            youtubeRefreshToken: "sasdfasd"
        })

        expect(await service.retryVideoRequestUpload("2323", "2323")).toBeUndefined();
        expect(service.uploadThumbnail).toHaveBeenCalledTimes(1);
        expect(service.authYoutube).toHaveBeenCalledTimes(1);

    })
})