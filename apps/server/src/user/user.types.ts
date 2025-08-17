import { UserType } from "@creatorsync/prisma/client"

export type CreateUserInput = {
    email: string,
    subId: string,
    username: string,
    type: UserType
}

export type FindUserResponse = {
    exists: boolean,
    id: string,
    username: string
}

export type UserChatsReponse = {
    id: string,
    updatedAt: Date,
    editor: {
        username: string
    },
    creator: {
        username: string
    }
}