import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { GuardUser } from '@creatorsync/prisma/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ServerService {
    constructor(private readonly prisma: PrismaService) { }

    async addFeature(user: GuardUser, data: string) {
        await this.prisma.feedback.create({
            data: {
                userId: user.id,
                username: user.username,
                feature: data
            }
        });

        return "Feature request submitted!";
    }


    async addFeedback(user: GuardUser, data: string) {
        await this.prisma.feedback.create({
            data: {
                userId: user.id,
                username: user.username,
                feedback: data
            }
        });

        return "Feedback submitted!";
    }
}
