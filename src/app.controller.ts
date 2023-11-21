import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Response,
  SetMetadata,
} from '@nestjs/common';
import { resolve } from 'path';
import express from 'express';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SamlAuthGuard } from './auth/saml-auth.guard';
import { UserService } from './user/user.service';
import { User } from './model/user';
import { SamlStrategy } from './auth/saml.strategy';
import { SessionGuard } from './auth/session.guard';
import { SamlOptions, Profile } from '@node-saml/passport-saml';
import { FetchService } from 'nestjs-fetch';

interface RequestWithUser extends express.Request {
  samlLogoutRequest: any;
  user: any;
}

@Controller()
export class AppController {
  profile: Profile;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly samlStrategy: SamlStrategy,
    private readonly fetch: FetchService,
  ) {
    this.profile = this.samlStrategy.profile;
  }

  @Get()
  async homepage(@Response() res: express.Response) {
    res.sendFile(resolve('web/index.html'));
  }

  @Get('api/auth/sso/saml/login')
  @UseGuards(SamlAuthGuard)
  async samlLogin() {
    //this route is handled by passport-saml
    return;
  }

  @Post('api/auth/sso/saml/login/callback')
  @UseGuards(SamlAuthGuard)
  async samlAssertionConsumer(
    @Request() req: express.Request,
    @Response() res: express.Response,
  ) {
    //this routes gets executed on successful assertion from IdP
    if (req.user) {
      const user = req.user as User;
      const jwt = this.authService.getTokenForUser(user);
      this.userService.storeUser(user);
      this, res.redirect('/?jwt=' + jwt);
    } else {
      res.redirect('/');
    }
  }

  @Get('api/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    const samlStrategy = this.samlStrategy;
    let url: string = '';
    if (samlStrategy._saml) {
      url = await samlStrategy._saml.getLogoutUrlAsync(samlStrategy.profile, '', {})
    }
    return {
      user: req.user,
      url: url
    }
  }

  @Get('api/auth/sso/saml/metadata')
  async getSpMetadata(@Response() res: express.Response) {
    const ret = this.samlStrategy.generateServiceProviderMetadata(null, null);
    res.type('application/xml');
    res.send(ret);
  }
}
