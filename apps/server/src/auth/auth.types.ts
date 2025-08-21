import { UserType } from "@creatorsync/prisma/client";

export type GoogleSigninResponse = {
    sub: string,
    name: string,
    given_name: string,
    picture: string,
    email: string,
    email_verified: boolean
}

export type AuthResponse = {
    userId: string,
    accessToken: string
}

export type GuardUser = {
    id: string;
    username: string;
    type: UserType;
    isYoutubeConnected: boolean;
};

declare module "express" {
    interface Request {
        user: GuardUser | null
    }
}