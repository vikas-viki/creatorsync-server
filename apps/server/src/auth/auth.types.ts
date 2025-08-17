import { UserType } from "@creatorsync/prisma/client"

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

declare module "express" {
    interface Request {
        user: {
            id: string;
            username: string;
            type: UserType
        } | null
    }
}