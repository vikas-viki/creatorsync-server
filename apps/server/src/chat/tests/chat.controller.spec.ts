import { Test, TestingModule } from "@nestjs/testing";
import { ChatController } from "../chat.controller"
import { ChatService } from "../chat.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@creatorsync/prisma/prisma.service";
import { UserChatsReponse } from "../../user/user.types";
import { GuardUser } from "../../auth/auth.types";
import { AddNewChatDTO, ChatData, NewMessageDTO, NewVideoRequest } from "../dtos/chat.dto";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";
import { Observable } from "rxjs";

describe('chat controller', () => {
    let controller: ChatController;
    let req: { user: GuardUser } = {
        user: {
            id: '123',
            username: 'user123',
            type: 'EDITOR',
            isYoutubeConnected: true
        }
    }
    let mockChatService = {
        getUserChats: jest.fn(),
        addNewVideoRequest: jest.fn(),
        retryVideoRequest: jest.fn(),
        approveVideoRequest: jest.fn(),
        getChatData: jest.fn(),
        mediaMessage: jest.fn(),
        addNewChat: jest.fn(),
        addTextMessage: jest.fn(),
        removeChat: jest.fn(),
        getVideoUploadProgress: jest.fn()
    };

    let mockJwtAuthGuard = {
        canActivate: () => true
    }

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                { provide: PrismaService, useValue: {} },
                { provide: JwtService, useValue: {} },
                { provide: ChatService, useValue: mockChatService }
            ]
        }).overrideGuard(mockJwtAuthGuard).useValue(mockJwtAuthGuard).compile();

        controller = module.get<ChatController>(ChatController);
    });

    it('should be defined', async () => {
        expect(controller).toBeDefined();
    });

    it('should return all chats on calling /chat/all', async () => {
        let req = {
            user: {
                id: '123',
                type: 'CREATOR'
            }
        };

        let data: UserChatsReponse[] = [
            {
                id: '123',
                updatedAt: new Date(),
                creator: {
                    username: 'user2'
                },
                editor: {
                    username: 'user1'
                }
            }
        ]

        mockChatService.getUserChats.mockResolvedValue(data);

        let result = await controller.getAllChats(req as any);

        expect(result).toEqual(data);
        expect(mockChatService.getUserChats).toHaveBeenCalledTimes(1);
        expect(mockChatService.getUserChats).toHaveBeenCalledWith(req.user.id, req.user.type);
    });

    it('should return an observable', async () => {
        let mockObservalbe = new Observable();

        mockChatService.getVideoUploadProgress.mockReturnValue(mockObservalbe);

        const result = controller.getVideoRequestStatus('123');

        expect(result).toBe(mockObservalbe);
        expect(result).toBeInstanceOf(Observable);
        expect(mockChatService.getVideoUploadProgress).toHaveBeenCalledTimes(1);
        expect(mockChatService.getVideoUploadProgress).toHaveBeenCalledWith('123');
    })

    it('should accept new video request', async () => {
        let param: NewVideoRequest = {
            title: 'Abcd',
            description: 'Abcd',
            chatId: '1234-1234-12345-1234',
            thumbnailType: 'png',
            videoType: 'mp4'
        }

        let data = {
            thumbnailSignedUrl: `https://my-bucket.s3.amazonaws.com/uploads/`,
            videoSignedUrl: `https://my-bucket.s3.amazonaws.com/uploads/`
        };

        mockChatService.addNewVideoRequest.mockResolvedValue(data);

        const result = await controller.newVideoRequest(req as any, param);

        expect(result).toEqual(data);
        expect(mockChatService.addNewVideoRequest).toHaveBeenCalledTimes(1);
        expect(mockChatService.addNewVideoRequest).toHaveBeenCalledWith(req.user, param);
    });

    it('should accept retry video request', async () => {
        let data = { message: "Video Upload started!" };

        mockChatService.retryVideoRequest.mockResolvedValue(data);

        const result = await controller.retryVideoRequest('1234', req as any);

        expect(result).toEqual(data);
        expect(mockChatService.retryVideoRequest).toHaveBeenCalledTimes(1);
        expect(mockChatService.retryVideoRequest).toHaveBeenCalledWith('1234', req.user);
    });

    it('should allow approving video request', async () => {
        let data = "Video upload started!";
        let param = { chatId: '4321' };

        mockChatService.approveVideoRequest.mockResolvedValue(data);

        let result = await controller.approveVideoRequest('1234', param, req as any);

        expect(result).toEqual(data);
        expect(mockChatService.approveVideoRequest).toHaveBeenCalledTimes(1);
        expect(mockChatService.approveVideoRequest).toHaveBeenCalledWith(param, '1234', req.user);
    });

    it('should allow getting chat data', async () => {
        let data: ChatData = {
            messages: [
                {
                    id: '123',
                    senderId: '321',
                    createdAt: new Date(),
                    type: 'text',
                    content: 'hello'
                }
            ],
            totalMessages: 0
        };

        mockChatService.getChatData.mockResolvedValue(data);

        const result = await controller.getChatData('123', req as any, 0);

        expect(result).toEqual(data);
        expect(mockChatService.getChatData).toHaveBeenCalledTimes(1);
        expect(mockChatService.getChatData).toHaveBeenCalledWith('123', req.user, 0);
    });

    it('should allow posting media content', async () => {
        let param = {
            contentType: 'image/png',
            chatId: '123'
        };

        let data: PresignedPost = {
            url: 'https://my-bucket.s3.amazonaws.com/uploads/',
            fields: {}
        };

        mockChatService.mediaMessage.mockResolvedValue(data);

        const result = await controller.mediaMessage(param, req as any);

        expect(result).toEqual(data);
        expect(mockChatService.mediaMessage).toHaveBeenCalledTimes(1);
        expect(mockChatService.mediaMessage).toHaveBeenCalledWith(param, req.user);
    });

    it('should allow adding new chat', async () => {
        let param: AddNewChatDTO = {
            editorId: '123'
        };

        let data = { chatId: '123', editorName: 'user', message: "Chat added successfully" };

        mockChatService.addNewChat.mockResolvedValue(data);

        const result = await controller.addNewChat(param, req as any);

        expect(result).toEqual(data);

        expect(mockChatService.addNewChat).toHaveBeenCalledTimes(1);
        expect(mockChatService.addNewChat).toHaveBeenCalledWith(param.editorId, req.user);
    });

    it('should allow posting text messages', async () => {
        let param: NewMessageDTO = {
            chatId: "123",
            data: "hello"
        };
        let data = {
            id: "321",
            chatId: "123",
            byId: "123",
            text: "hello",
            image: [],
            video: []
        }
        mockChatService.addTextMessage.mockResolvedValue(data);

        const result = await controller.addNewMessage(param, req as any);

        expect(result).toEqual(data);
        expect(mockChatService.addTextMessage).toHaveBeenCalledTimes(1);
        expect(mockChatService.addTextMessage).toHaveBeenCalledWith(param, req.user);
    });

    it('should allow removing chats', async () => {
        let data = "Chat removed successfully!";

        mockChatService.removeChat.mockResolvedValue(data);

        const result = await controller.removeChat(req as any, '123');

        expect(result).toEqual(data);
        expect(mockChatService.removeChat).toHaveBeenCalledTimes(1);
        expect(mockChatService.removeChat).toHaveBeenCalledWith(req.user, '123');
    })
})