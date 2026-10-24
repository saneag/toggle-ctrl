import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { EmailService } from "./email.service.js";
import { FeatureToggleRetentionService } from "./feature-toggle-retention.service.js";
import {
  FeatureToggleController,
  FeatureToggleSdkKeyController,
  PublicFeatureToggleController,
} from "./feature-toggle.controller.js";
import { FeatureToggleService } from "./feature-toggle.service.js";
import { InvitationController } from "./invitation.controller.js";
import { InvitationService } from "./invitation.service.js";
import { MembershipController } from "./membership.controller.js";
import { MembershipService } from "./membership.service.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationService } from "./organization.service.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [
    AuthController,
    OrganizationController,
    MembershipController,
    InvitationController,
    FeatureToggleController,
    FeatureToggleSdkKeyController,
    PublicFeatureToggleController,
  ],
  providers: [
    AuthService,
    SessionService,
    OrganizationService,
    MembershipService,
    InvitationService,
    EmailService,
    FeatureToggleService,
    FeatureToggleRetentionService,
  ],
})
export class AuthModule {}
