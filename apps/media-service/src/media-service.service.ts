import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaServiceService implements OnModuleInit {

    constructor(private configService: ConfigService) { }

    private s3: S3Client;

    onModuleInit() {
        this.s3 = new S3Client({
            region: this.configService.get<string>("AWS_REGION"),
            credentials: {
                accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY")!,
                secretAccessKey: this.configService.get<string>("AWS_SECRET_KEY")!
            }
        })
    }

    async getSignedUrlForUpload(key: string, contentType: string) {
        const data = await createPresignedPost(this.s3, {
            Bucket: this.configService.get<string>("AWS_S3_BUCKET")!,
            Key: key,
            Conditions: [
                ['content-length-range', 0, 10 * 1024 * 1024]
            ],
            Fields: {
                'Content-Type': contentType,
            },
            Expires: 120
        })

        return data;
    }

    async getSignedUrlForView(keys: string[]) {
        const data: Record<string, string> = {};
        const bucket = this.configService.get<string>("AWS_S3_BUCKET")!

        await Promise.all(keys.map(async k => {
            if (k.length == 0) {
                data[k] = "";
                return;
            }
            try {
                const command = new GetObjectCommand({
                    Bucket: bucket,
                    Key: k
                });

                const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 * 2 });
                data[k] = signedUrl;
            } catch (err) {
                console.error(`Failed to generate signed URL for key "${k}":`, err);
                data[k] = "";
            }
        }));

        return data;
    }
}
