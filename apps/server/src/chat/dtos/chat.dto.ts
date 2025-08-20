import { VideoRequestStatus } from "@creatorsync/prisma/client";
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

export class NewVideoRequestDTO {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    chatId: string

    @IsString()
    thumbnailType: string

    @IsString()
    videoType: string
}

export type NewVideoRequest = InstanceType<typeof NewVideoRequestDTO>;

export type VideoRequestResponse = {
    id: string,
    title: string,
    description: string,
    thumbnail: string,
    video: string,
    versions: number,
    status: VideoRequestStatus
    createdAt: Date
}

export class VideoRequestApprovalDTO {
    @IsString()
    access_token: string;
    @IsString()
    videoRequestId: string;
    @IsString()
    chatId: string;
}

export type VideoRequestApprovalData = InstanceType<typeof VideoRequestApprovalDTO>;