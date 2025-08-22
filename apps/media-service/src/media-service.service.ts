import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import { google } from 'googleapis';
import { OAuth2Client, TokenInfo } from 'google-auth-library';
import Redis from "ioredis";
import progress from "progress-stream";
import { Readable } from 'stream';

interface UploadVideoParams {
    accessToken: string;
    refreshToken: string;
    s3Bucket: string;
    videoKey: string;
    title: string;
    expiresAt: Date,
    description: string;
    thumbnailKey: string;
    videoRequestId: string;
    userId: string
}

@Injectable()
export class MediaServiceService implements OnModuleInit {

    private s3: S3Client;
    private bucket: string = "";
    private googleOauthClient: null | OAuth2Client = null;
    private redis: Redis | null;

    constructor(private configService: ConfigService, private prisma: PrismaService) {
        this.bucket = this.configService.get<string>("AWS_S3_BUCKET") ?? "";
        this.redis = new Redis(this.configService.get<string>("REDIS_URL") ?? "");
        this.redis.on("connect", () => {
            console.log("Redis client connected!");
        })
        this.googleOauthClient = new google.auth.OAuth2(
            this.configService.get<string>("GOOGLE_CLIENT_ID"),
            this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
            this.configService.get<string>("GOOGLE_REDIRECT_URL")
        );
    }

    onModuleInit() {
        this.s3 = new S3Client({
            region: this.configService.get<string>("AWS_REGION"),
            credentials: {
                accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY")!,
                secretAccessKey: this.configService.get<string>("AWS_SECRET_KEY")!
            }
        })
    }

    getYoutubeAuthLink(): string | undefined {
        const link = this.googleOauthClient?.generateAuthUrl({
            access_type: 'offline',
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/youtube.upload",
                "https://www.googleapis.com/auth/youtube"
            ]
        });

        return link;
    }

    async updateYoutbeCredentials(code: string, userId: string) {
        const token = await this.googleOauthClient?.getToken(code);
        const refresh_token = token?.tokens.refresh_token;
        const access_token = token?.tokens.access_token;
        const expiresAt = token?.tokens.expiry_date;

        if (!refresh_token || !access_token || !expiresAt) {
            return "MISSING_TOKENS";
        }


        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                youtubeAccessToken: access_token,
                youtubeRefreshToken: refresh_token,
                youtubeExpiresAt: new Date(expiresAt)
            }
        })

        return "OKAY";
    }

    async uploadVideoRequestToYoutube(userId: string, videoRequestId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const videoRequest = await this.prisma.videoRequest.findFirst({
            where: {
                id: videoRequestId
            }
        });
        if (!videoRequest) return;

        return await this.uploadVideoToYouTube({
            videoRequestId: videoRequestId,
            accessToken: user?.youtubeAccessToken!,
            refreshToken: user?.youtubeRefreshToken!,
            expiresAt: user?.youtubeExpiresAt!,
            s3Bucket: this.bucket,
            videoKey: videoRequest.video,
            title: videoRequest.title,
            description: videoRequest.description,
            thumbnailKey: videoRequest.thumbnail,
            userId
        })
    }

    async uploadVideoToYouTube({
        videoRequestId,
        accessToken,
        refreshToken,
        expiresAt,
        s3Bucket,
        videoKey,
        title,
        userId,
        description,
        thumbnailKey,
    }: UploadVideoParams) {
        try {
            this.googleOauthClient!.setCredentials({ access_token: accessToken, refresh_token: refreshToken, expiry_date: expiresAt.getTime() });
            if (!this.googleOauthClient!.credentials || Date.now() >= this.googleOauthClient!.credentials.expiry_date!) {

                const { credentials } = await this.googleOauthClient!.refreshAccessToken();

                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        youtubeAccessToken: credentials.access_token!,
                        youtubeExpiresAt: new Date(credentials.expiry_date!),
                    },
                });
            }
            const youtube = google.youtube({ version: 'v3', auth: this.googleOauthClient! });

            const head = (await this.s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: videoKey })));
            const videoStream = head.Body as Readable;
            const videoFileSize = head.ContentLength;
            const videoProgressStream = progress({
                length: videoFileSize,
                time: 1000
            });
            let prev = 0;

            videoProgressStream.on('progress', (p) => {
                const percent = +p.percentage.toFixed(2);
                if (percent > prev + 5) {
                    prev = percent;
                    this.redis!.publish(videoRequestId, JSON.stringify({ video: percent, thumbnail: 0 }));
                }
            })

            const response = await youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title,
                        description
                    },
                    status: {
                        privacyStatus: 'public',
                    },
                },
                media: {
                    body: videoStream.pipe(videoProgressStream)
                }
            });

            await this.prisma.videoRequest.update({
                where: {
                    id: videoRequestId
                },
                data: {
                    uploadStatus: "VIDEO_UPLOADED"
                }
            });

            if (response.data.id) {
                prev = 0;
                const videoId = response.data.id;
                const thumbnailHead = (await this.s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: thumbnailKey })));
                const thumbnailStream = thumbnailHead.Body as Readable;
                await youtube.thumbnails.set({
                    videoId,
                    media: {
                        mimeType: thumbnailHead.ContentType,
                        body: thumbnailStream,
                    },
                });
                this.redis!.publish(videoRequestId, JSON.stringify({ video: 100, thumbnail: 100 }));
                await this.prisma.videoRequest.update({
                    where: {
                        id: videoRequestId
                    },
                    data: {
                        uploadStatus: "THUMBNAIL_UPDATED"
                    }
                });
            }
            return response.data;
        } catch (e) {
            console.log("error: ", e)
            await this.prisma.videoRequest.update({
                where: { id: videoRequestId },
                data: { status: "PENDING" }
            })
        }
    }

    async getSignedUrlForUpload(key: string, contentType: string) {
        const data = await createPresignedPost(this.s3, {
            Bucket: this.bucket,
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