import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { UserService } from "../../user/user.service";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { of } from "rxjs";
import { BadRequestException } from "@nestjs/common";
import axios from "axios";

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('authService', () => {
    let service: AuthService;

    const mockUserService = {
        findUser: jest.fn(),
        createUser: jest.fn()
    };
    const mockJwtService = {
        sign: jest.fn()
    };
    const mockConfigService = {
        get: jest.fn()
    };
    const mockClientProxy = { send: jest.fn() };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                AuthService,
                { provide: UserService, useValue: mockUserService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: 'MEDIA_SERVICE', useValue: mockClientProxy },
            ]
        }).compile();

        service = module.get(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    })

    it('should get url if youtube is not connected', async () => {
        const authUrl = "https://auth.google.com";

        mockClientProxy.send.mockReturnValue(of(authUrl));

        const user = {
            id: "123",
            username: "user",
            type: "CREATOR",
            isYoutubeConnected: false
        };

        const result = await service.getYoutubeAuthLink(user as any);

        expect(result).toEqual(authUrl);
        expect(mockClientProxy.send).toHaveBeenCalledTimes(1);
        expect(mockClientProxy.send).toHaveBeenCalledWith({ cmd: 'get_youtube_auth_link' }, {});
    });

    it('should throw error if youtube is already connected', async () => {
        const user = {
            id: "123",
            username: "user",
            type: "CREATOR",
            isYoutubeConnected: true
        };

        expect(service.getYoutubeAuthLink(user as any)).rejects.toThrow(BadRequestException);
    });

    // signin
    it('should return correct auth response for signin if user exists', async () => {
        const data = {
            accessToken: "user_123",
            type: "CREATOR"
        };

        mockedAxios.get.mockResolvedValue({
            data: { sub: '456', email: 'user@gmail.com', given_name: 'user' }
        });

        mockUserService.findUser.mockResolvedValue({
            exists: true,
            id: '123',
            username: 'user'
        });

        mockJwtService.sign.mockReturnValue('fake-token');

        const result = await service.signin(data as any);

        expect(result).toEqual({
            accessToken: 'fake-token',
            userId: '123'
        })

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockUserService.findUser).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${data.accessToken}`
            }
        });
        expect(mockJwtService.sign).toHaveBeenCalledWith({ userId: '123', type: data.type });
    });

    it('should return correct auth response for signin if user doesnot exists', async () => {
        const data = {
            accessToken: "user_123",
            type: "CREATOR"
        };

        mockedAxios.get.mockResolvedValue({
            data: { sub: '456', email: 'user@gmail.com', given_name: 'user' }
        });

        mockUserService.findUser.mockResolvedValue({
            exists: false,
            id: '123',
            username: 'user'
        });
        mockUserService.createUser.mockResolvedValue('123');

        mockJwtService.sign.mockReturnValue('fake-token');

        const result = await service.signin(data as any);

        expect(result).toEqual({
            accessToken: 'fake-token',
            userId: '123'
        })

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockUserService.findUser).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${data.accessToken}`
            }
        });
        expect(mockJwtService.sign).toHaveBeenCalledWith({ userId: '123', type: data.type });
    });

    // signup
    it('should return correct auth response for signup if user exists', async () => {
        const data = {
            accessToken: "user_123",
            type: "CREATOR"
        };

        mockedAxios.get.mockResolvedValue({
            data: { sub: '456', email: 'user@gmail.com', given_name: 'user' }
        });

        mockUserService.findUser.mockResolvedValue({
            exists: true,
            id: '123',
            username: 'user'
        });

        mockJwtService.sign.mockReturnValue('fake-token');

        const result = await service.signup(data as any);

        expect(result).toEqual({
            accessToken: 'fake-token',
            userId: '123'
        })

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockUserService.findUser).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${data.accessToken}`
            }
        });
        expect(mockJwtService.sign).toHaveBeenCalledWith({ userId: '123', type: data.type });
    });

    it('should return correct auth response for signup if user doesnot exists', async () => {
        const data = {
            accessToken: "user_123",
            type: "CREATOR"
        };

        mockedAxios.get.mockResolvedValue({
            data: { sub: '456', email: 'user@gmail.com', given_name: 'user' }
        });

        mockUserService.findUser.mockResolvedValue({
            exists: false,
            id: '123',
            username: 'user'
        });
        mockUserService.createUser.mockResolvedValue('123');

        mockJwtService.sign.mockReturnValue('fake-token');

        const result = await service.signup(data as any);

        expect(result).toEqual({
            accessToken: 'fake-token',
            userId: '123'
        })

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockUserService.findUser).toHaveBeenCalledTimes(1);
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${data.accessToken}`
            }
        });
        expect(mockJwtService.sign).toHaveBeenCalledWith({ userId: '123', type: data.type });
    });

    it('should throw error if accesstoken is invalid', async () => {
        const data = {
            accessToken: "user_123",
            type: "CREATOR"
        };

        mockedAxios.get.mockRejectedValue(new Error('Invalid access token'));

        expect(service.signup(data as any)).rejects.toThrow(Error);
    });

    it('should return valid url if access token is valid', async () => {
        const frontendUrl = 'https://creator-sync.0xbuilder.in';
        mockClientProxy.send.mockReturnValue(of("OKAY"));

        mockConfigService.get.mockReturnValue(frontendUrl);
        const result = await service.handleYoutubeAuthLink('123', { id: '456' } as any);

        expect(result).toEqual(`${frontendUrl}`);
        expect(mockClientProxy.send).toHaveBeenCalledTimes(1);
        expect(mockClientProxy.send).toHaveBeenCalledWith({ cmd: 'update_youtube_credentials' }, { code: '123', userId: '456' })
    })


    it('should not return valid url if access token is not valid', async () => {
        const frontendUrl = 'https://creator-sync.0xbuilder.in';
        mockClientProxy.send.mockReturnValue(of("MISSING_TOKENS"));

        mockConfigService.get.mockReturnValue(frontendUrl);
        const result = await service.handleYoutubeAuthLink('123', { id: '456' } as any);

        expect(result).toEqual(`${frontendUrl}?error=Couldn't authenticate youtube request!`);
        expect(mockClientProxy.send).toHaveBeenCalledTimes(1);
        expect(mockClientProxy.send).toHaveBeenCalledWith({ cmd: 'update_youtube_credentials' }, { code: '123', userId: '456' })
    })
})