import { MessageType } from "@creatorsync/prisma/client";
import { IsEnum, IsString } from "class-validator";

export class AddNewChatDTO {
    @IsString()
    editorId: string;
}

export class NewMessageDTO {
    @IsEnum(MessageType)
    type: MessageType;
    @IsString()
    chatId: string;
    @IsString()
    data: string; // either image/video uploaded url or text
}

export type NewMessage = InstanceType<typeof NewMessageDTO>;