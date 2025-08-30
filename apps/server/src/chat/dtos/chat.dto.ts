import { VideoRequestStatus, VideoUploadStatus } from "@creatorsync/prisma/client";
import { IsString, Matches, MaxLength } from "class-validator";

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
    @MaxLength(100, { message: "Video title can be max 100 characters" })
    title: string;

    @MaxLength(5000, { message: "Video description can be max 5000 characters" })
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
    errorReason: string
    video: string,
    status: VideoRequestStatus
    createdAt: Date,
    uploadStatus: VideoUploadStatus
}

export class VideoRequestApprovalDTO {
    @IsString()
    chatId: string;
}

export type VideoRequestApprovalData = InstanceType<typeof VideoRequestApprovalDTO>;