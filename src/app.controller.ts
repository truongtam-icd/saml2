import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Response,
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

@Controller()
export class AppController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly samlStrategy: SamlStrategy,
  ) {}

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
    }
  }

  @Get('api/profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Get('api/auth/sso/saml/logout')
  async samlLogout(
    @Request() req: express.Request,
    @Response() res: express.Response,
  ) {
    const samlStrategy = this.samlStrategy;
    const options = samlStrategy._saml?.options;

    (this.samlStrategy as any).logout(req, () => {
      res.redirect(options?.logoutUrl || '/');
    });
  }

  @Post('api/auth/sso/saml/logout/callback')
  @UseGuards(SamlAuthGuard)
  async samlSingleLogoutService(
    @Request() req: express.Request,
    @Response() res: express.Response
  ) {
    res.redirect('/');
  }

  @Get('api/auth/sso/saml/metadata')
  async getSpMetadata(@Response() res: express.Response) {
    const ret = this.samlStrategy.generateServiceProviderMetadata(null, null);
    res.type('application/xml');
    res.send(ret);
  }
}
