import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { AuthInput } from './dtos/auth.dto';
import axios from "axios"
import { AuthResponse, GoogleSigninResponse } from './auth.types';
import { JwtService } from "@nestjs/jwt"
import { UserType } from '@creatorsync/prisma/client';


@Injectable()
export class AuthService {

    constructor(private readonly userService: UserService, private readonly jwtService: JwtService,) { }

    async handleYoutubeAuth() {
    }

    async signup(data: AuthInput): Promise<AuthResponse> {
        return await this.authenticateUser(data);
    }

    async signin(data: AuthInput): Promise<AuthResponse> {
        return this.authenticateUser(data);
    }

    getAccessToken(userId: string, type: UserType): string {
        const accessToken = this.jwtService.sign({ userId, type });

        return accessToken;
    }

    async authenticateUser(data: AuthInput): Promise<AuthResponse> {
        try {
            const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${data.accessToken}`,
                },
            });
            const res = response.data as GoogleSigninResponse;
            const userExists = await this.userService.findUser(res.email);

            if (userExists.exists)
                return {
                    accessToken: this.getAccessToken(userExists.id, data.type),
                    userId: userExists.id
                };

            const userId = await this.userService.createUser({
                subId: res.sub,
                username: res.given_name,
                email: res.email,
                type: data.type
            })

            return {
                accessToken: this.getAccessToken(userExists.id, data.type),
                userId: userId
            };
        } catch (e) {
            console.log(e);
            throw new Error('Invalid access token');
        }
    }
}
