import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserInput, FindUserResponse } from './user.types';
@Injectable()
export class UserService {

    constructor(private readonly prisma: PrismaService
    ) { }


    async findUserById(id: string): Promise<FindUserResponse> {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id
                }
            });
            return {
                id: user?.id ?? "",
                exists: !!user,
                username: user?.username ?? ""
            };
        } catch {
            return {
                id: "",
                exists: false,
                username: ""
            };
        }
    }

    async isYoutubeConnected(id: string): Promise<boolean> {
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id
                }
            });

            if (user?.youtubeRefreshToken) {
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    async findUser(email: string): Promise<FindUserResponse> {
        try {
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
        } catch {
            return {
                id: "",
                exists: false,
                username: ""
            };
        }
    }

    async createUser(data: CreateUserInput): Promise<string> {
        try {
            const user = await this.prisma.user.create({
                data: {
                    username: data.username,
                    subId: data.subId,
                    type: data.type,
                    email: data.email
                }
            });
            return user.id;
        } catch {
            throw new InternalServerErrorException("Couldn't create user, please try again later!");
        }
    }
}
