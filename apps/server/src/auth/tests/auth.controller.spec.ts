import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { UserService } from "../../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ClientProxy } from "@nestjs/microservices";
import { JwtAuthGuard } from "../guards/jwt.guard";
import { InternalServerErrorException } from "@nestjs/common";


describe('authController', () => {
    let controller: AuthController;

    const CONSTANTS = {
        frontendUrl: "https://creator-sync.0xbuilder.in",
        googleAuthUrl: "https://auth.google.com",
        serviceAuthResponse: {
            userId: "123",
            accessToken: "user_123"
        },
        authResponse: 'Authentication successful!'
    }
    const mockAuthService = {
        getYoutubeAuthLink: jest.fn().mockResolvedValue(CONSTANTS.googleAuthUrl),
        handleYoutubeAuthLink: jest.fn().mockResolvedValue(CONSTANTS.frontendUrl),
        signin: jest.fn().mockResolvedValue(CONSTANTS.serviceAuthResponse),
        signup: jest.fn().mockResolvedValue(CONSTANTS.serviceAuthResponse)
    }

    const mockAuthGuard = {
        canActivate: () => true
    }

    beforeEach(async () => {
        let module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: UserService, useValue: {} },
                { provide: JwtService, useValue: {} },
                { provide: ConfigService, useValue: {} },
                { provide: ClientProxy, useValue: {} }
            ]
        }).overrideGuard(JwtAuthGuard).useValue(mockAuthGuard).compile();

        controller = module.get<AuthController>(AuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    })

    it('should return url for youtube auth if youtube not connected', async () => {
        const req = {
            user: {
                isYoutubeConnected: false
            }
        };

        const result = await controller.getYoutubeAuthLink(req as any);

        expect(result).toEqual({ url: CONSTANTS.googleAuthUrl });
        expect(mockAuthService.getYoutubeAuthLink).toHaveBeenCalledWith(req.user);
    });

    it('should throw an error if youtube is already connected', async () => {
        mockAuthService.getYoutubeAuthLink.mockResolvedValue(null);
        const req = {
            user: {
                isYoutubeConnected: true
            }
        };

        expect(controller.getYoutubeAuthLink(req as any)).rejects.toThrow(InternalServerErrorException);
        expect(mockAuthService.getYoutubeAuthLink).toHaveBeenCalledWith(req.user);
    })

    it('should redirect on youtube auth callback', async () => {
        const req = {
            user: {
                id: "user",
                username: "user",
                type: "CREATOR",
                isYoutubeConnected: true
            }
        };

        const res = {
            redirect: jest.fn()
        }

        const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        await controller.handleYoutubeAuth(code, req as any, res as any);

        expect(res.redirect).toHaveBeenCalledTimes(1);
        expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(CONSTANTS.frontendUrl))
    });

    it('should set cookie on signin', async () => {
        const res = {
            cookie: jest.fn()
        };
        const data = {
            accessToken: CONSTANTS.serviceAuthResponse.accessToken,
            type: "CREATOR"
        };

        const result = await controller.signin(data as any, res as any);

        expect(result).toEqual(CONSTANTS.authResponse);
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(res.cookie).toHaveBeenCalledWith('jwt', CONSTANTS.serviceAuthResponse.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
    });

    it('should set cookie on signup', async () => {
        const res = {
            cookie: jest.fn()
        };
        const data = {
            accessToken: CONSTANTS.serviceAuthResponse.accessToken,
            type: "CREATOR"
        };

        const result = await controller.signup(data as any, res as any);

        expect(result).toEqual(CONSTANTS.authResponse);
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(res.cookie).toHaveBeenCalledWith('jwt', CONSTANTS.serviceAuthResponse.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
    });

    it('should return user session data on calling session', async () => {
        const req = {
            user: {
                username: "user",
                id: "123",
                type: "CREATOR",
                isYoutubeConnected: true
            }
        };

        const res = {
            username: req.user.username,
            userId: req.user.id,
            type: req.user.type,
            isYoutubeConnected: req.user.isYoutubeConnected
        }

        const result = await controller.getSession(req as any);

        expect(result).toEqual(res);
    });

    it('should unset cookie on logout', () => {
        const res = {
            cookie: jest.fn()
        };

        const result = controller.logout(res as any);

        expect(result).toEqual("Logout successful!");
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(res.cookie).toHaveBeenCalledWith('jwt', '', {
            maxAge: 1
        })
    })
})