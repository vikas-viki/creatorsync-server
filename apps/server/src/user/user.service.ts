import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateUserInput, FindUserResponse } from './user.types';
@Injectable()
export class UserService {

    constructor(private readonly prisma: PrismaService
    ) { }


    async findUserById(id: string): Promise<FindUserResponse> {
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
    }

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
}
