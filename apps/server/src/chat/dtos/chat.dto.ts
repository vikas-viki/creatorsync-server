import { IsString } from "class-validator";

export class AddNewChatDTO {
    @IsString()
    editorId: string;
}