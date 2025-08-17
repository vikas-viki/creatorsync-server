import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateUserInput, FindUserResponse, UserChatsReponse } from './user.types';
import { UserType } from '@creatorsync/prisma/client';
@Injectable()
export class UserService {

    constructor(private readonly prisma: PrismaService) { }

    async findUser(email: string): Promise<FindUserResponse> {
        const user = await this.prisma.user.findUnique({
            where: {
                email
            }
        });
        return {
            id: user?.id ?? "",
            exists: !!user,
            username: user?.username ?? ""
        };
    }

    async createUser(data: CreateUserInput): Promise<string> {
        const user = await this.prisma.user.create({
            data: {
                username: data.username,
                subId: data.subId,
                type: data.type,
                email: data.email
            }
        });
        return user.id;
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
                    select: { username: true }
                },
                creator: {
                    select: { username: true }
                }
            }
        });

        return chats;
    }
}
