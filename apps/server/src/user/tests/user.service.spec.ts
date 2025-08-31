import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "../user.service";
import { PrismaService } from "@creatorsync/prisma/prisma.service";
import { InternalServerErrorException } from "@nestjs/common";

describe('userService', () => {
    let service: UserService;

    let mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn()
        }
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: PrismaService, useValue: mockPrismaService }
            ]
        }).compile();

        service = module.get(UserService);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return right result if user exists(id)', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
            id: "123",
            username: "user"
        });

        const result = await service.findUserById('123');

        expect(result).toEqual({
            id: '123',
            exists: true,
            username: 'user'
        });
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: '123'
            }
        });
    });

    it('should return right result if user doesnot exists(id)', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.findUserById('123');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: '123'
            }
        });
    });

    it('should return fallback if prisma client is null', async () => {
        service['PrismaService'] = null;

        const result = await service.findUserById('123');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
    });

    it('should return fallback if db call fails', async () => {
        mockPrismaService.user.findUnique.mockRejectedValue(new Error());

        const result = await service.findUserById('123');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
    });

    it('should return true if youtube is connected', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
            youtubeRefreshToken: 'real-token'
        });

        const result = await service.isYoutubeConnected('123');

        expect(result).toEqual(true);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: '123'
            }
        });
    });

    it('should return false if youtube is not connected', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
            youtubeRefreshToken: null
        });

        const result = await service.isYoutubeConnected('123');

        expect(result).toEqual(false);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: '123'
            }
        });
    });

    it('should return fallback if prisma client is null', async () => {
        service['PrismaService'] = null;

        const result = await service.isYoutubeConnected('123');

        expect(result).toEqual(false);
    });

    it('should return fallback if db call fails', async () => {
        mockPrismaService.user.findUnique.mockRejectedValue(new Error())

        const result = await service.isYoutubeConnected('123');

        expect(result).toEqual(false);
    });

    it('should return right result if user exists(email)', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
            id: "123",
            username: "user"
        });

        const result = await service.findUser('user@gmail.com');

        expect(result).toEqual({
            id: '123',
            exists: true,
            username: 'user'
        });
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                email: 'user@gmail.com'
            }
        });
    });

    it('should return fallback if db call fails', async () => {
        mockPrismaService.user.findUnique.mockRejectedValue(new Error());

        const result = await service.findUser('user@gmail.com');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
    });

    it('should return right result if user doesnot exists', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.findUser('user@gmail.com');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
            where: {
                email: 'user@gmail.com'
            }
        });
    });

    it('should return fallback if prisma client is null', async () => {
        service['PrismaService'] = null;

        const result = await service.findUser('user@gmail.com');

        expect(result).toEqual({
            id: "",
            exists: false,
            username: ''
        });
    });

    it('should create user if db call doesn\'t fail', async () => {
        mockPrismaService.user.create.mockResolvedValue({
            id: '123'
        });

        const data = {
            email: 'user@gmail.com',
            subId: '234',
            username: 'user',
            type: 'CREATOR'
        };
        const result = await service.createUser(data as any);

        expect(result).toEqual('123');
        expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.create).toHaveBeenCalledWith({
            data
        });
    })

    it('should return fallback if prisma client is null', async () => {
        service['PrismaService'] = null;


        const data = {
            email: 'user@gmail.com',
            subId: '234',
            username: 'user',
            type: 'CREATOR'
        };

        expect(service.createUser(data as any)).rejects.toThrow(InternalServerErrorException);
    });

});