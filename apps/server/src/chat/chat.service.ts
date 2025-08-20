import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Message, MessageType, UserType, VideoRequestStatus } from '@creatorsync/prisma/client';
import { UserChatsReponse } from '../user/user.types';
import { UserService } from '../user/user.service';
import { NewMedia, NewMessage, NewVideoRequest, VideoRequestApprovalData, VideoRequestResponse } from './dtos/chat.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GuardUser } from '../auth/auth.types';

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService,
        @Inject("MEDIA_SERVICE") private client: ClientProxy,
        @Inject(forwardRef(() => UserService)) private readonly userService: UserService
    ) { }

    async checkIfUserChatFound(chatId: string, user: GuardUser) {
        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId,
                ...(user.type == "CREATOR" ? { creatorId: user.id } : { editorId: user.id })
            }
        });

        if (!chat) {
            throw new ForbiddenException("Chat not found!");
        }
    }

    async approveVideoRequest(data: VideoRequestApprovalData, user: GuardUser) {
        await this.checkIfUserChatFound(data.chatId, user);

        const videoRequest = await this.prisma.videoRequest.findFirst({
            where: {
                id: data.videoRequestId,
                chatId: data.chatId
            }
        });

        if (user.type != "CREATOR") {
            throw new BadRequestException("Only Creatros are allowed to create video requests!");
        }

        if (!videoRequest) {
            throw new NotFoundException("Video request not found!");
        }

        if (videoRequest.status == "APPROVED") {
            throw new BadRequestException("Video request already approved.");
        }

        const response = await firstValueFrom(this.client.send({ cmd: "upload_approved_videoRequest" }, { access_token: data.access_token, videoRequestId: data.videoRequestId }));
        console.log({ response });
        return "Video upload started!";
    }

    async getChatData(chatId: string, user: GuardUser) {
        await this.checkIfUserChatFound(chatId, user);

        const messages = await this.prisma.message.findMany({
            where: {
                chatId
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                image: true,
                video: true,
                type: true,
                createdAt: true,
                id: true,
                byId: true,
                text: true,
                videoRequest: {
                    select: {
                        id: true,
                        video: true,
                        thumbnail: true,
                        title: true,
                        description: true,
                        version: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: {
                        version: 'desc'
                    }
                },
            },
            take: 30
        });

        const videoRequests = messages.filter(m => m.type == "VIDEO_REQUEST");
        const videoRequestsData: Record<string, VideoRequestResponse> = {};

        await Promise.all(videoRequests.map(async (v) => {
            const data: { video: string, thumbnail: string, id: string, title: string, description: string, createdAt: Date, status: VideoRequestStatus, version: number } = v.videoRequest[0];

            const signedUrls: Record<string, string> = await firstValueFrom(this.client.send({ cmd: 'signed_urls_view' }, { keys: [data.thumbnail, data.video] }));
            videoRequestsData[v.id] = {
                title: data.title,
                id: data.id,
                description: data.description,
                video: signedUrls[data.video],
                thumbnail: signedUrls[data.thumbnail],
                versions: data.version,
                status: data.status,
                createdAt: data.createdAt
            }
        }))

        const messagesData: Record<string, string> = {};
        const keys = messages.filter(m => m.type !== "TEXT" && m.type != "VIDEO_REQUEST").map(m => {
            const k = this.getContent(m.type, m as unknown as Message);

            messagesData[m.id] = k;
            return k;
        });
        const urls: Record<string, string> = await firstValueFrom(this.client.send({ cmd: 'signed_urls_view' }, { keys }));
        const data = messages.map(m => ({
            id: m.id,
            senderId: m.byId,
            createdAt: m.createdAt,
            type: m.type.toLowerCase(),
            content: m.type === "TEXT" ? m.text ?? "" : urls[messagesData[m.id]] ?? "",
            ...(m.type == "VIDEO_REQUEST" ? { videoRequest: videoRequestsData[m.id] } : {})
        }))

        return data;
    }

    getContent(type: MessageType, message: Message): string {
        if (type == "IMAGE") {
            return message.image[0] ?? "";
        } else {
            return message.video[0] ?? "";
        }
    }

    async removeChat(creator: GuardUser, chatId: string) {
        if (creator.type != UserType.CREATOR) {
            throw new BadRequestException("Only creators are allowed to delete chats!");
        }

        const chat = await this.getChat(undefined, undefined, chatId);

        if (!chat) {
            throw new BadRequestException("Chat doesnot exists!");
        }

        // perform deletion in s3 (for media)
        // other things in db will auto delete cause of cascade.
        await this.prisma.chat.delete({
            where: {
                id: chat.id
            }
        });
    }

    async addNewChat(editorId: string, creator: GuardUser) {
        if (creator.type != UserType.CREATOR) {
            throw new BadRequestException("Only creators are allowed to add chats!");
        }

        const user = await this.userService.findUserById(editorId);

        if (!user.exists) {
            throw new BadRequestException("Editor doesn't exists!");
        }

        const chat = await this.getChat(creator.id, editorId);

        if (chat) {
            throw new BadRequestException("Chat already exists!");
        }

        const newChat = await this.prisma.chat.create({
            data: {
                creatorId: creator.id,
                editorId
            }
        });

        return { chatId: newChat.id, editorName: user.username, message: "Chat added successfully" };
    }

    async deleteChat(creator: GuardUser, chatId: string) {
        if (creator.type != UserType.CREATOR) {
            throw new BadRequestException("Only creators are alllowed to delete chats!");
        }

        const chat = await this.getChat(creator.id, undefined, chatId);

        if (chat) {
            await this.prisma.chat.delete({
                where: {
                    id: chat.id
                }
            });
        } else {
            throw new BadRequestException("Chat doesnot exists!");
        }

        return { message: "Chat Deleted successfully" };
    }

    async mediaMessage(data: NewMedia, user: GuardUser): Promise<string> {
        await this.checkIfUserChatFound(data.chatId, user);

        const isImage = data.contentType.startsWith("image");
        const message = await this.prisma.message.create({
            data: {
                chatId: data.chatId,
                byId: user.id,
                type: isImage ? "IMAGE" : "VIDEO" as MessageType,
                image: [""],
                video: [""]
            }
        });
        const key = `chats/${data.chatId}/${isImage ? "image" : "video"}-${message.id}`;
        await this.prisma.message.update({
            where: {
                id: message.id
            },
            data: {
                ...(isImage ? { image: [key] } : { video: [key] })
            }
        })
        return await firstValueFrom(this.client.send({ cmd: "signed_url_upload" }, { key, contentType: data.contentType })) as unknown as string;
    }

    async addTextMessage(data: NewMessage, user: GuardUser) {
        await this.checkIfUserChatFound(data.chatId, user);

        await this.prisma.message.create({
            data: {
                chatId: data.chatId,
                type: "TEXT",
                text: data.data.toString(),
                byId: user.id
            }
        });
    }

    async addNewVideoRequest(user: GuardUser, data: NewVideoRequest) {
        await this.checkIfUserChatFound(data.chatId, user);
        const message = await this.prisma.message.create({
            data: {
                chatId: data.chatId,
                byId: user.id,
                type: "VIDEO_REQUEST"
            }
        });
        const videoRequest = await this.prisma.videoRequest.create({
            data: {
                chatId: data.chatId,
                title: data.title,
                description: data.description,
                thumbnail: "",
                video: "",
                messageId: message.id,
                version: 1,
                status: VideoRequestStatus.PENDING
            }
        });
        const thumbnailKey = `chats/${data.chatId}/${videoRequest.id}-thumbnail-${message.id}`;
        const videoKey = `chats/${data.chatId}/${videoRequest.id}-video-${message.id}`;

        await this.prisma.videoRequest.update({
            where: {
                id: videoRequest.id
            },
            data: {
                thumbnail: thumbnailKey,
                video: videoKey
            }
        })

        const thumbnailSignedUrl = await firstValueFrom(this.client.send({ cmd: "signed_url_upload" }, { key: thumbnailKey, contentType: data.thumbnailType })) as unknown as string;
        const videoSignedUrl = await firstValueFrom(this.client.send({ cmd: "signed_url_upload" }, { key: videoKey, contentType: data.thumbnailType })) as unknown as string;

        return { thumbnailSignedUrl, videoSignedUrl };
    }

    async getChat(creatorId?: string, editorId?: string, chatId?: string) {
        const chat = await this.prisma.chat.findFirst({
            where: {
                ...(creatorId ? { creatorId: creatorId } : {}),
                ...(editorId ? { editorId: editorId } : {}),
                ...(chatId ? { id: chatId } : {})
            }
        });

        return chat;
    }

    async getUserChats(userId: string, type: UserType): Promise<UserChatsReponse[]> {
        const chats = await this.prisma.chat.findMany({
            where: {
                ...(type === "CREATOR" ? { creatorId: userId } : { editorId: userId })
            },
            select: {
                updatedAt: true,
                id: true,
                editor: {
                    select: { username: true, id: true }
                },
                creator: {
                    select: { username: true, id: true }
                }
            }
        });

        return chats;
    }

}
