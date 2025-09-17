import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "../chat.service"
import { PrismaService } from "@creatorsync/prisma/prisma.service";
import { ClientProxy } from "@nestjs/microservices";
import { UserService } from "../../user/user.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Observable, of, take } from "rxjs";
import { UserType } from "@creatorsync/prisma/client";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";

describe('chat service', () => {
    let service: ChatService;

    let mockPrismaService = {
        videoRequest: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn().mockResolvedValue(true)
        },
        chat: {
            create: jest.fn(),
            findUnique: jest.fn().mockResolvedValue(true),
            findFirst: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn()
        },
        message: {
            count: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        }
    };
    let mockUserService = {
        findUserById: jest.fn()
    };
    let mockMediaService = {
        emit: jest.fn(),
        send: jest.fn()
    };
    let mockConfigService = {
        get: () => "redis://localhost:6379"
    }
    let mockRedis = {
        subscribe: jest.fn((channel, cb) => cb(null)),
        unsubscribe: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
    };

    beforeEach(async () => {

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: "MEDIA_SERVICE", useValue: mockMediaService },
                { provide: UserService, useValue: mockUserService },
                { provide: ConfigService, useValue: mockConfigService }
            ]
        }).compile();

        service = module.get(ChatService);
        (service as any).redis = mockRedis;
    });

    afterEach(() => {
        jest.clearAllMocks();
    })

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // video request approval
    it('should throw if youtube is not connected', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            isYoutubeConnected: false
        };

        expect(service.approveVideoRequest(param, '123', user as any))
            .rejects.toThrow(
                new ForbiddenException("Please connect youtube to continue!")
            );
    });

    it('should throw if given chatId is not found', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            isYoutubeConnected: true
        };
        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.approveVideoRequest(param, '123', user as any))
            .rejects.toThrow(
                new NotFoundException("Chat not found!")
            );
    });

    it('should throw if editor try to approve video request', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            isYoutubeConnected: true,
            type: "EDITOR"
        };
        mockPrismaService.chat.findUnique.mockResolvedValue(10);
        mockPrismaService.videoRequest.findFirst.mockResolvedValue(null);

        expect(service.approveVideoRequest(param, '123', user as any))
            .rejects.toThrow(
                new BadRequestException("Only Creatros are allowed to create video requests!")
            );
    });

    it('should throw if video request is not found', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            isYoutubeConnected: true,
            type: "CREATOR"
        };
        mockPrismaService.chat.findUnique.mockResolvedValue(10);
        mockPrismaService.videoRequest.findFirst.mockResolvedValue(null);

        expect(service.approveVideoRequest(param, '123', user as any))
            .rejects.toThrow(
                new NotFoundException("Video request not found!")
            );
    });

    it('should throw if video request is already approved', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            isYoutubeConnected: true,
            type: "CREATOR"
        };

        mockPrismaService.chat.findUnique.mockResolvedValue(10);
        mockPrismaService.videoRequest.findFirst.mockResolvedValue({ status: "APPROVED" });

        expect(service.approveVideoRequest(param, '123', user as any))
            .rejects.toThrow(
                new BadRequestException("Video request already approved.")
            );
    });

    it('should allow video request approval if all checks have passed', async () => {
        let param = {
            chatId: "123"
        };

        let user = {
            id: '123',
            isYoutubeConnected: true,
            type: "CREATOR"
        };

        mockPrismaService.chat.findUnique.mockResolvedValue(10);
        mockPrismaService.videoRequest.findFirst.mockResolvedValue({ status: "PENDING" });

        let result = await service.approveVideoRequest(param, '123', user as any);

        expect(result).toEqual("Video upload started!");
        expect(mockMediaService.emit).toHaveBeenCalledTimes(1);
        expect(mockMediaService.emit).toHaveBeenCalledWith({ cmd: "upload_approved_video-request" }, { userId: "123", videoRequestId: "123" });
    });

    it('should fail if chat based on chatId is not found', async () => {
        let user = {
            isYoutubeConnected: true
        };

        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.getChatData('123', user as any, 0))
            .rejects.toThrow(
                new NotFoundException("Chat not found!")
            );
    });

    it('should return right structured chat data (for empty)', async () => {
        mockPrismaService.message.count.mockResolvedValue(0);
        mockPrismaService.message.findMany.mockResolvedValue([]);
        mockPrismaService.chat.findUnique.mockResolvedValue(true);
        mockMediaService.send.mockReturnValue(of({ file1: "signed-url-1" }));

        const result1 = await service.getChatData('123', {} as any, 0);

        expect(result1).toEqual({ messages: [], totalMessages: 0 })
    });

    it('should return right structured chat data (for empty)', async () => {
        mockPrismaService.message.count.mockResolvedValue(0);
        mockPrismaService.message.findMany.mockResolvedValue([]);
        mockPrismaService.chat.findUnique.mockResolvedValue(true);
        mockMediaService.send.mockReturnValue(of({}));

        const result1 = await service.getChatData('123', {} as any, 0);

        expect(result1).toEqual({ messages: [], totalMessages: 0 });
    });

    it('should return right structured chat data', async () => {
        let messages = [
            {
                id: "123",
                type: "TEXT",
                byId: "321",
                text: "Hello",
                createdAt: new Date(),
            },
            {
                id: "132",
                type: "IMAGE",
                byId: "321",
                image: ["s3_image_key"],
                createdAt: new Date(),
            },
            {
                id: "213",
                type: "VIDEO",
                byId: "321",
                video: ["s3_video_key"],
                createdAt: new Date(),
            },
            {
                id: "231",
                byId: "321",
                type: "VIDEO_REQUEST",
                videoRequest: [{
                    messageId: "231",
                    id: "123",
                    video: "s3_videorequest_video_key",
                    thumbnail: "s3_videoequest_thumbnail_key",
                    title: "This is title",
                    description: "This is description",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    youtubeVideoId: null,
                    status: "PENDING",
                    uploadStatus: "NOT_APPROVED",
                    errorReason: null
                }]
            }
        ];

        mockPrismaService.message.count.mockResolvedValue(4);
        mockPrismaService.message.findMany.mockResolvedValue(messages);
        mockPrismaService.chat.findUnique.mockResolvedValue(true);
        let mockSignedUrls = {
            "s3_image_key": "https://s3_image_key",
            "s3_video_key": "https://s3_video_key",
            "s3_videorequest_video_key": "https://s3_videorequest_video_key",
            "s3_videoequest_thumbnail_key": "https://s3_videoequest_thumbnail_key"
        };
        mockMediaService.send.mockReturnValue(of(mockSignedUrls));

        let expectedResult = [
            {
                id: "123",
                senderId: "321",
                createdAt: messages[0].createdAt,
                type: "text",
                content: "Hello"
            },
            {
                id: "132",
                senderId: "321",
                createdAt: messages[1].createdAt,
                type: "image",
                content: mockSignedUrls.s3_image_key
            },
            {
                id: "213",
                senderId: "321",
                createdAt: messages[2].createdAt,
                type: "video",
                content: mockSignedUrls.s3_video_key
            },
            {
                id: "231",
                senderId: "321",
                createdAt: messages[3].createdAt,
                type: "video_request",
                content: "",
                videoRequest: {
                    title: "This is title",
                    id: "123",
                    errorReason: "",
                    description: "This is description",
                    video: mockSignedUrls.s3_videorequest_video_key,
                    thumbnail: mockSignedUrls.s3_videoequest_thumbnail_key,
                    status: "PENDING",
                    createdAt: messages[3].videoRequest![0].createdAt,
                    uploadStatus: "NOT_APPROVED",
                }
            },
        ]

        const result1 = await service.getChatData('123', {} as any, 0);

        expect(result1).toEqual({ messages: expectedResult, totalMessages: 4 });
    });

    it('should return corrent content data for image/video', async () => {
        expect(
            service.getContent(
                "IMAGE",
                { image: ["abcd_123"] } as any
            )
        ).toEqual("abcd_123");

        expect(
            service.getContent(
                "VIDEO",
                { video: ["abcd_123"] } as any
            )
        ).toEqual("abcd_123");

        expect(
            service.getContent(
                "VIDEO_REQUEST",
                { video: ["abcd_123"] } as any
            )
        ).toEqual("");
    });

    it('should throw if editor tries to remove chat', async () => {
        expect(service.removeChat({ type: "EDITOR" } as any, "123"))
            .rejects.toThrow(new BadRequestException("Only creators are allowed to delete chats!"))
    });

    it('should throw if chatId is not found', async () => {
        mockPrismaService.chat.findFirst.mockResolvedValue(null);
        expect(service.removeChat({ type: UserType.CREATOR } as any, "123"))
            .rejects.toThrow(new BadRequestException("Chat doesnot exists!"))
    });

    it('should remove chat if every check passes', async () => {
        mockPrismaService.chat.findFirst.mockResolvedValue({ id: '123' });

        mockPrismaService.chat.delete.mockResolvedValue(true);

        const result = await service.removeChat({ type: UserType.CREATOR } as any, "123");

        expect(result).toEqual("Chat removed successfully!");
        expect(mockPrismaService.chat.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw if editor tried to create a chat', async () => {
        expect(service.addNewChat("231", { type: UserType.EDITOR } as any))
            .rejects.toThrow(
                new BadRequestException("Only creators are allowed to add chats!")
            );
    })

    it('should throw if user is not found', async () => {
        mockUserService.findUserById.mockResolvedValue({ exists: false });

        expect(service.addNewChat("231", { type: UserType.CREATOR } as any))
            .rejects.toThrow(
                new NotFoundException("Editor doesn't exists!")
            );
    });

    it('should throw if chat between creator-editor already exists', async () => {
        mockUserService.findUserById.mockResolvedValue({ exists: true });
        mockPrismaService.chat.findFirst.mockResolvedValue({ id: '231' });

        expect(service.addNewChat("231", { type: UserType.CREATOR } as any))
            .rejects.toThrow(
                new BadRequestException("Chat already exists!")
            );
    });

    it('should create new chat if every check passes', async () => {
        mockUserService.findUserById.mockResolvedValue({ exists: true, username: "user" });
        mockPrismaService.chat.findFirst.mockResolvedValue(null);
        mockPrismaService.chat.create.mockResolvedValue({ id: '123' })

        const result = await service.addNewChat("231", { type: UserType.CREATOR } as any);

        expect(result).toEqual(
            { chatId: "123", editorName: "user", message: "Chat added successfully" }
        )
    });

    it('should fail if chat is not found', async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.mediaMessage({} as any, {} as any))
            .rejects.toThrow(new NotFoundException("Chat not found!"));
    });

    it('should allow posting media message if every check passes', async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue({ id: '123' });
        mockPrismaService.message.create.mockResolvedValue({ id: "123" });
        mockPrismaService.message.update.mockResolvedValue({});

        let data: PresignedPost = {
            url: "https://abcd",
            fields: {}
        }
        mockMediaService.send.mockReturnValue(of(data));

        const result = await service.mediaMessage(
            {
                contentType: "image/png",
                chatId: "123"
            },
            {
                id: "123"
            } as any
        );

        expect(result).toEqual(data);
        expect(mockMediaService.send).toHaveBeenCalledTimes(1);
        expect(mockMediaService.send).toHaveBeenCalledWith(
            { cmd: "signed_url_upload" }, { key: `chats/123/image-123`, contentType: "image/png" }
        );
        expect(mockPrismaService.message.update).toHaveBeenCalledTimes(1);
    });

    it('should fail if chat is not found', async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.addTextMessage({} as any, {} as any))
            .rejects.toThrow(new NotFoundException("Chat not found!"));
    });

    it('should create message if every check passes', async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue({ id: "123" });

        mockPrismaService.message.create.mockResolvedValue(true);

        await service.addTextMessage(
            { chatId: "123", data: "Hello" } as any,
            { type: "CREATOR", id: "123" } as any
        );
    });

    it('should fail if chat is not found', async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.addNewVideoRequest({} as any, { chatId: "123" } as any))
            .rejects.toThrow(new NotFoundException("Chat not found!"));
    });

    it("should create video request if all the checks pass", async () => {
        mockPrismaService.chat.findUnique.mockResolvedValue({ id: '123' });

        let param = {
            title: "This is a title",
            description: "This is a description",
            chatId: "123",
            thumbnailType: "image/png",
            videoType: "video/mp4"
        };

        let user = {
            id: "123"
        };

        mockPrismaService.message.create.mockResolvedValue({ id: "123" });
        mockPrismaService.videoRequest.create.mockResolvedValue({ id: '123' });
        mockMediaService.send.mockReturnValue(of("this_is_a_signed_url"));

        const result = await service.addNewVideoRequest(user as any, param);

        expect(mockMediaService.send).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ thumbnailSignedUrl: "this_is_a_signed_url", videoSignedUrl: "this_is_a_signed_url" })
    });

    it('should throw if editor tries to retry failed video request', async () => {
        expect(service.retryVideoRequest("231", { type: "EDITOR" } as any))
            .rejects.toThrow(new BadRequestException("Only Creatros are allowed to create video requests!"))
    });

    it('should throw if video request is not found', async () => {
        mockPrismaService.videoRequest.findUnique.mockResolvedValue(null);

        expect(service.retryVideoRequest("123", { type: "CREATOR" } as any))
            .rejects.toThrow(new NotFoundException("Video Request not found!"))
    })

    it('should throw if video request is already processed', async () => {
        mockPrismaService.videoRequest.findUnique.mockResolvedValue({ status: "APPROVED" });

        expect(service.retryVideoRequest("123", { type: "CREATOR" } as any))
            .rejects.toThrow(new BadRequestException("Video request already processed & uploaded!"))
    });

    it('should fail if chat is not found', async () => {
        mockPrismaService.videoRequest.findUnique.mockResolvedValue({ chatId: "123", status: "ERROR" });
        mockPrismaService.chat.findUnique.mockResolvedValue(null);

        expect(service.retryVideoRequest("123", { type: "CREATOR", id: "123" } as any))
            .rejects.toThrow(new NotFoundException("Chat not found!"));
    });

    it('should correctly retry video request upload if every check passes', async () => {
        mockPrismaService.videoRequest.findUnique.mockResolvedValue({ status: "APPROVED" });
        mockPrismaService.videoRequest.findUnique.mockResolvedValue({ chatId: "123", status: "ERROR" });
        mockPrismaService.chat.findUnique.mockResolvedValue({ id: "123" });
        mockPrismaService.videoRequest.update.mockResolvedValue(null);

        const result = await service.retryVideoRequest("123", { type: "CREATOR", id: "123" } as any);

        expect(result).toEqual({ message: "Video Upload started!" });
    });

    it('should return all user chats', async () => {
        let data = [
            {
                updatedAt: new Date(),
                id: "123",
                editor: {
                    username: "editor",
                    id: "123"
                },
                creator: {
                    username: "creator",
                    id: "132"
                }
            }
        ];

        mockPrismaService.chat.findMany.mockResolvedValue(data);

        expect(await service.getUserChats("123", "EDITOR")).toEqual(data);
    });

    it('should return an observable on calling getVideoUploadProgress', () => {
        expect(service.getVideoUploadProgress("123")).toBeDefined();
    });

    it('should emit a message when redis emits a message', async () => {
        const handlerMap: Record<string, Function> = {};

        mockRedis.on.mockImplementation((event, handler) => {
            handlerMap[event] = handler;
        })

        const obs$ = service.getVideoUploadProgress('123');

        obs$.pipe(take(1)).subscribe({
            next: (msg) => {
                expect(msg).toEqual({ data: "Hello World" })
            }
        });

        handlerMap["message"]("123", "Hello World");
    })

    it("should clean up on unsubscribe", () => {
        const obs$ = service.getVideoUploadProgress("123");
        const subscription = obs$.subscribe();

        subscription.unsubscribe();

        expect(mockRedis.unsubscribe).toHaveBeenCalledWith("123");
        expect(mockRedis.off).toHaveBeenCalled();
    });

    it('should throw error if error occurs', (done) => {
        mockRedis.subscribe.mockImplementation((_, cb) => {
            cb(new Error('fail'));
        });

        const obs$ = service.getVideoUploadProgress('123');

        obs$.subscribe({
            next: () => {
                done.fail("next should not have been called");
            },
            error: (err) => {
                expect(err).toBeInstanceOf(InternalServerErrorException);
                done();
            }
        });
    });

})