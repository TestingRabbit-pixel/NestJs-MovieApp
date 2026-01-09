import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { User } from './user/user.schema';
import { RegisterDTO } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModel: any;
  let mockJwtService: JwtService;

  const mockUser = {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'securePassword123',
  };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mockToken'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDTO = {
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        username: mockUser.username,
        email: mockUser.email,
        password: mockUser.password,
      };

      // Mock no existing user
      mockUserModel.findOne.mockResolvedValue(null);

      // Create a mock instance to simulate mongoose document
      const savedUserMock = {
        ...registerDto,
        _id: 'mockUserId',
        save: jest.fn().mockResolvedValue(this),
      };
      
      mockUserModel.create.mockResolvedValue(savedUserMock);

      const result = await authService.register(registerDto);

      expect(result).toEqual({
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        username: mockUser.username,
      });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ username: mockUser.username }, { email: mockUser.email }],
      });
    });

    it('should throw an error if user already exists', async () => {
      const registerDto: RegisterDTO = {
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        username: mockUser.username,
        email: mockUser.email,
        password: mockUser.password,
      };

      // Mock existing user
      mockUserModel.findOne.mockResolvedValue({
        username: mockUser.username,
      });

      await expect(authService.register(registerDto)).rejects.toThrow(
        new HttpException('User already exists', HttpStatus.UNAUTHORIZED)
      );
    });

    it('should hash the password before saving', async () => {
      const registerDto: RegisterDTO = {
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        username: mockUser.username,
        email: mockUser.email,
        password: mockUser.password,
      };

      // Mock no existing user
      mockUserModel.findOne.mockResolvedValue(null);

      const bcryptSpy = jest.spyOn(bcrypt, 'hash');

      // Create a mock instance to simulate mongoose document
      const savedUserMock = {
        ...registerDto,
        _id: 'mockUserId',
        save: jest.fn().mockResolvedValue(this),
      };
      
      mockUserModel.create.mockResolvedValue(savedUserMock);

      await authService.register(registerDto);

      expect(bcryptSpy).toHaveBeenCalledWith(
        registerDto.password, 
        expect.any(Number)
      );
    });
  });
});