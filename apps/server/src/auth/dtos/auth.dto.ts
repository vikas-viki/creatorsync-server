import { UserType } from "@creatorsync/prisma/client";
import {IsEnum, IsString} from "class-validator";

export class AuthInput {
    @IsString()
    accessToken: string;
    @IsEnum(UserType, {message: "type must be either CREATOR or EDITOR"})
    type: UserType;
}