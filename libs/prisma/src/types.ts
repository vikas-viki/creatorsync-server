import { UserType } from "./client";

export type GuardUser = {
    id: string;
    username: string;
    type: UserType
};

declare module "express" {
    interface Request {
        user: GuardUser | null
    }
}