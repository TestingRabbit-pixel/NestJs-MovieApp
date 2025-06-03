import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user/user.schema';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
      ],
      providers: [
        AuthService,
        {
          provide: 'UserModel', // Mocking Mongoose model
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          }
        }
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    mockUserModel = module.get('UserModel');
  });

  describe('User Registration', () => {
    const validRegisterDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      username: 'testuser'
    };

    it('should successfully register a new user', async () => {
      // Mock no existing user with this email
      mockUserModel.findOne.mockResolvedValue(null);
      
      // Mock user creation
      mockUserModel.create.mockResolvedValue({
        ...validRegisterDto,
        _id: 'mockUserId'
      });

      const result = await authService.register(validRegisterDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(validRegisterDto.email);
      expect(result.username).toBe(validRegisterDto.username);
    });

    it('should throw ConflictException for duplicate email', async () => {
      // Mock existing user with this email
      mockUserModel.findOne.mockResolvedValue({
        email: validRegisterDto.email
      });

      await expect(authService.register(validRegisterDto))
        .rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      const weakPasswordDto: RegisterDto = {
        ...validRegisterDto,
        password: 'weak'
      };

      await expect(authService.register(weakPasswordDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should hash the user password before saving', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        ...validRegisterDto,
        _id: 'mockUserId'
      });

      await authService.register(validRegisterDto);

      expect(hashSpy).toHaveBeenCalledWith(
        validRegisterDto.password, 
        expect.any(Number)
      );
    });

    it('should validate email format', async () => {
      const invalidEmailDto: RegisterDto = {
        ...validRegisterDto,
        email: 'invalid-email'
      };

      await expect(authService.register(invalidEmailDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should require a username', async () => {
      const noUsernameDto = { 
        ...validRegisterDto, 
        username: '' 
      };

      await expect(authService.register(noUsernameDto))
        .rejects.toThrow(BadRequestException);
    });
  });
});