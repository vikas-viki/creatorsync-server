import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { UserType } from '@creatorsync/prisma/client';
import { UserChatsReponse } from '../user/user.types';
import { GuardUser } from '../auth/auth.types';
import { UserService } from '../user/user.service';

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService,
        @Inject(forwardRef(() => UserService)) private readonly userService: UserService
    ) { }

    getVideoRequest() {

    }

    getChatData() {

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

    addNewMessage() {

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
