import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Message, MessageType, UserType, VideoRequestStatus, VideoUploadStatus } from '@creatorsync/prisma/client';
import { UserChatsReponse } from '../user/user.types';
import { UserService } from '../user/user.service';
import { ChatData, NewMedia, NewMessage, NewVideoRequest, VideoRequestApprovalData, VideoRequestResponse } from './dtos/chat.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { GuardUser } from '../auth/auth.types';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class ChatService {
    private redis: Redis | null;
    private sqs: SQSClient | null;
    private SQS_url: string | null;

    constructor(private readonly prisma: PrismaService,
        @Inject("MEDIA_SERVICE") private client: ClientProxy,
        @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {
        this.sqs = new SQSClient({ 
            region: "ap-south-1",
            credentials: {
                accessKeyId: this.configService.get<string>("SQS_ACCESS_KEY") ?? "",
                secretAccessKey: this.configService.get<string>("SQS_SECRET_ACCESS_KEY") ?? ""
            }
        });
        this.SQS_url = this.configService.get<string>("SQS_URL") ?? null;
        this.redis = new Redis(this.configService.get<string>("REDIS_URL") ?? "");
    }

    async checkIfUserChatFound(chatId: string, user: GuardUser) {
        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId,
                ...(user.type == "CREATOR" ? { creatorId: user.id } : { editorId: user.id })
            }
        });

        if (!chat) {
            throw new NotFoundException("Chat not found!");
        }
    }

    getVideoUploadProgress(videoRequestId: string): Observable<MessageEvent> {
        return new Observable<MessageEvent>((subscriber) => {
            this.redis!.subscribe(videoRequestId, (err) => {
                if (err) {
                    throw new InternalServerErrorException("Error getting updates for video request, please try again later");
                }
                console.log("subscribed to: ", videoRequestId);
            });

            const handler = (channel: string, message: string) => {
                if (channel == videoRequestId) {
                    subscriber.next({
                        data: message
                    } as MessageEvent);
                }
            }

            this.redis?.on("message", handler);

            return () => {
                console.log("unsubscribed from: ", videoRequestId);
                this.redis?.unsubscribe(videoRequestId);
                this.redis?.off("message", handler);
            }
        })
    }

    async approveVideoRequest(data: VideoRequestApprovalData, videoRequestId: string, user: GuardUser) {
        if (!user.isYoutubeConnected) {
            throw new ForbiddenException("Please connect youtube to continue!");
        }
        await this.checkIfUserChatFound(data.chatId, user);

        const videoRequest = await this.prisma.videoRequest.findFirst({
            where: {
                id: videoRequestId,
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

        const pushResult = await this.pushToSQS({ cmd: "upload_approved_video-request", data: { userId: user.id, videoRequestId: videoRequestId } });
        // this.client.emit({ cmd: "upload_approved_video-request" }, { userId: user.id, videoRequestId: videoRequestId });

        if (pushResult) {
            await this.prisma.videoRequest.update({
                where: {
                    id: videoRequestId
                },
                data: {
                    status: "APPROVED",
                    uploadStatus: 'QUEUED'
                }
            });

            return "Video queued for upload!";
        } else {
            return "Couldn't approve video request, please try again later."
        }
    }

    async getChatData(chatId: string, user: GuardUser, skip: number): Promise<ChatData> {
        await this.checkIfUserChatFound(chatId, user);
        const totalMessages: number = await this.prisma.message.count({
            where: {
                chatId
            }
        })
        const messages = totalMessages > 0 ? await this.prisma.message.findMany({
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
                        status: true,
                        createdAt: true,
                        uploadStatus: true,
                        errorReason: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
            },
            take: 30,
            skip
        }) : [];

        const videoRequests = messages.filter(m => m.type == "VIDEO_REQUEST");
        const videoRequestsData: Record<string, VideoRequestResponse> = {};

        await Promise.all(videoRequests.map(async (v) => {
            const data:
                {
                    video: string,
                    thumbnail: string,
                    id: string,
                    title: string,
                    description: string,
                    createdAt: Date,
                    status: VideoRequestStatus,
                    uploadStatus: VideoUploadStatus,
                    errorReason: string | null
                } = v.videoRequest[0];

            const signedUrls: Record<string, string> = await firstValueFrom(this.client.send({ cmd: 'signed_urls_view' }, { keys: [data.thumbnail, data.video] }));
            videoRequestsData[v.id] = {
                title: data.title,
                id: data.id,
                errorReason: data.errorReason ?? "",
                description: data.description,
                video: signedUrls[data.video],
                thumbnail: signedUrls[data.thumbnail],
                status: data.status,
                createdAt: data.createdAt,
                uploadStatus: data.uploadStatus
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

        return { messages: data, totalMessages };
    }

    getContent(type: MessageType, message: Message): string {
        if (type == "IMAGE") {
            return message.image[0] ?? "";
        } else if (type == "VIDEO") {
            return message.video[0] ?? "";
        } else {
            return "";
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

        return "Chat removed successfully!";
    }

    async addNewChat(editorId: string, creator: GuardUser) {
        if (creator.type != UserType.CREATOR) {
            throw new BadRequestException("Only creators are allowed to add chats!");
        }

        const user = await this.userService.findUserById(editorId);

        if (!user.exists) {
            throw new NotFoundException("Editor doesn't exists!");
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
                status: "PENDING",
                uploadStatus: "NOT_APPROVED"
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

    async pushToSQS(data: any): Promise<boolean> {
        try {
            if (!this.sqs || !this.SQS_url) return false;

            const params = {
                QueueUrl: this.SQS_url,
                MessageBody: JSON.stringify(data)
            }

            await this.sqs.send(new SendMessageCommand(params));
            return true;
        } catch (e) {
            console.log(e);
        }
        return false;
    }

    async retryVideoRequest(videoRequestId: string, user: GuardUser) {
        if (user.type != "CREATOR") {
            throw new BadRequestException("Only Creatros are allowed to create video requests!");
        }

        const videoRequest = await this.prisma.videoRequest.findUnique({
            where: {
                id: videoRequestId
            }
        });

        if (!videoRequest) throw new NotFoundException("Video Request not found!");

        if (videoRequest.status != "ERROR") throw new BadRequestException("Video request already processed & uploaded!");

        await this.checkIfUserChatFound(videoRequest?.chatId, user);

        // this.client.emit({ cmd: 'retry_video-request_upload' }, { videoRequestId, userId: user.id });
        const pushResult = await this.pushToSQS({ cmd: 'retry_video-request_upload', data: { videoRequestId, userId: user.id } })

        if (pushResult) {
            await this.prisma.videoRequest.update({
                where: {
                    id: videoRequestId
                },
                data: {
                    status: "APPROVED",
                    uploadStatus: "QUEUED"
                }
            })

            return { message: "Video Upload Queued!" };
        } else {
            return { message: "Couldn't start upload, please try again later." };
        }
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
