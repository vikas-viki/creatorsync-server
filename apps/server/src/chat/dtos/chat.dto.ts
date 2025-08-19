import { IsString, Matches } from "class-validator";

export class AddNewChatDTO {
    @IsString()
    editorId: string;
}

export class NewMessageDTO {
    @IsString()
    chatId: string;
    @IsString()
    data: string; // either image/video uploaded url or text
}

export type NewMessage = InstanceType<typeof NewMessageDTO>;

export class NewMediaDTO {
    @IsString()
    @Matches(/^(image|video)\//, {
        message: "contentType must start with 'image/' or 'video/'",
    })
    contentType: string;
    @IsString()
    chatId: string;
}

export type NewMedia = InstanceType<typeof NewMediaDTO>;