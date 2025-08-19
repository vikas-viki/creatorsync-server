import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Message, MessageType, UserType } from '@creatorsync/prisma/client';
import { UserChatsReponse } from '../user/user.types';
import { UserService } from '../user/user.service';
import { NewMedia, NewMessage } from './dtos/chat.dto';
import { GuardUser } from '@creatorsync/prisma/types';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService,
        @Inject("MEDIA_SERVICE") private client: ClientProxy,
        @Inject(forwardRef(() => UserService)) private readonly userService: UserService
    ) { }

    getVideoRequest() {

    }

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
                        video: true
                    }
                },
            },
            take: 30
        });

        const messagesData: Record<string, string> = {};

        const keys = messages.filter(m => m.type !== "TEXT").map(m => {
            const k = this.getContent(m.type, m as unknown as Message & { videoRequest?: { video: string } | null });

            messagesData[m.id] = k;
            return k;
        });
        const urls: Record<string, string> = await firstValueFrom(this.client.send({ cmd: 'signed_urls_view' }, { keys }));
        const data = messages.map(m => ({
            id: m.id,
            senderId: m.byId,
            createdAt: m.createdAt,
            type: m.type.toLowerCase(),
            content: m.type === "TEXT" ? m.text ?? "" : urls[messagesData[m.id]] ?? ""
        }))

        return data;
    }

    getContent(type: MessageType, message: Message & { videoRequest?: { video: string } | null }): string {
        console.log(type, message.image)
        if (type == "IMAGE") {
            return message.image[0] ?? "";
        } else if (type == "VIDEO") {
            return message.video[0] ?? "";
        } else if (type == "VIDEO_REQUEST") {
            return message.videoRequest?.video ?? ""
        } else {
            return message.text || "";
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

    // async getSignedUrlForView(key: string) {

    // }

    async mediaMessage(data: NewMedia, user: GuardUser): Promise<string> {
        await this.checkIfUserChatFound(data.chatId, user);

        const isImage = data.contentType.startsWith("image");
        const message = await this.prisma.message.create({
            data: {
                chatId: data.chatId,
                byId: user.id,
                type: isImage ? "IMAGE" : "VIDEO" as MessageType,
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

    addNewVideoRequest() {

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
