import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GuardUser } from "./auth/auth.types"

@Injectable()
export class ServerService {
    constructor(private readonly prisma: PrismaService) { }

    async addFeature(user: GuardUser, data: string) {
        try {
            await this.prisma.feedback.create({
                data: {
                    userId: user.id,
                    username: user.username,
                    feature: data
                }
            });

            return "Feature request submitted!";
        } catch {
            return "Couldn't add feature, please try again later";
        }
    }


    async addFeedback(user: GuardUser, data: string) {
        try {
            await this.prisma.feedback.create({
                data: {
                    userId: user.id,
                    username: user.username,
                    feedback: data
                }
            });

            return "Feedback submitted!";
        } catch {
            return "Couldn't add feedback, please try again later";
        }
    }
}
