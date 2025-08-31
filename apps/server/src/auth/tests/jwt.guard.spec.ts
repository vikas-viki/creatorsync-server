import { ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt.guard";

describe('authGuard', () => {
    let guard: JwtAuthGuard;

    let mockJwtService = {
        verify: jest.fn()
    };

    let mockPrismaService = {
        user: {
            findUnique: jest.fn()
        }
    }

    beforeEach(() => {
        guard = new JwtAuthGuard(mockPrismaService as any, mockJwtService as any);
    });

    it('should fail if token doesnot exists', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    cookies: {}
                })
            })
        };

        const result = await guard.canActivate(mockContext as ExecutionContext);

        expect(result).toEqual(false);
    });

    it('should fail if user doesnot exists', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    cookies: {
                        jwt: 'fake-token'
                    }
                })
            })
        };

        mockJwtService.verify.mockReturnValue({ userId: '123', type: 'CREATOR' });

        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await guard.canActivate(mockContext as ExecutionContext);

        expect(result).toEqual(false);
        expect(mockJwtService.verify).toHaveBeenCalledTimes(1);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);

        expect(mockJwtService.verify).toHaveBeenCalledWith('fake-token');
    })

    it('should fail if jwt verification or db fails', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    cookies: {
                        jwt: 'fake-token'
                    }
                })
            })
        };

        mockJwtService.verify.mockImplementationOnce(() => {
            throw new Error('Invalid token')
        });

        const result = await guard.canActivate(mockContext as ExecutionContext);

        expect(result).toEqual(false);
        expect(mockJwtService.verify).toHaveBeenCalledTimes(2);// 1 extra call cause of setup
    });

    it('should pass if jwt is valid and user exists', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    cookies: {
                        jwt: 'fake-token'
                    }
                })
            })
        };

        mockJwtService.verify.mockReturnValue({ userId: '123', type: 'CREATOR' });
        mockPrismaService.user.findUnique.mockResolvedValue({
            id: '123',
            isYoutubeConnected: true,
            username: 'user',
            type: "CREATOR"
        });

        const result = await guard.canActivate(mockContext as ExecutionContext);

        expect(result).toEqual(true);
    });
});