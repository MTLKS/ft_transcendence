import { FriendshipController } from './friendship/friendship.controller';
import { FriendshipService } from './friendship/friendship.service';
import { TYPEORM_CONFIG } from './config/typeorm.config';
import { MULTER_CONFIG } from 'src/config/multer.config';
import { Friendship } from './entity/friendship.entity';
import { UserController } from './user/user.controller';
import { AuthController } from './auth/auth.controller';
import { MulterModule } from '@nestjs/platform-express';
import { TFAController } from './tfa/tfa.controller';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TFAService } from './tfa/tfa.service';
import { User } from './entity/user.entity';
import { AppService } from './app.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [TypeOrmModule.forRoot(TYPEORM_CONFIG), TypeOrmModule.forFeature([User]), TypeOrmModule.forFeature([Friendship]), MulterModule.register(MULTER_CONFIG)],
  controllers: [AppController, AuthController, UserController, TFAController, FriendshipController],
  providers: [AppService, AuthService, UserService, TFAService, FriendshipService],
})
export class AppModule {}
