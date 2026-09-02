import type { Request } from "express";

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuditService } from "./audit.service";

export const REPORT_UNLOCK_COOKIE_PREFIX = "ara_report_unlock_";

/**
 * Computes the value expected in the unlock cookie for a given report,
 * derived from its password so that changing/regenerating the password
 * automatically invalidates any previously issued cookie.
 */
export function computeReportUnlockToken(
  consultUniqueId: string,
  reportPassword: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${consultUniqueId}:${reportPassword}`)
    .digest("hex");
}

/**
 * Protects the public report endpoints behind an optional passcode.
 * Audits without a `reportPassword` remain fully public (kept for
 * backwards compatibility with audits created before this feature).
 */
@Injectable()
export class ReportAccessGuard implements CanActivate {
  constructor(
    private readonly auditService: AuditService,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const consultUniqueId = request.params.consultUniqueId as string;

    const reportPassword =
      await this.auditService.getReportPasswordByConsultId(consultUniqueId);

    // Audit doesn't exist: let the controller handle the 404/410 response.
    if (reportPassword === undefined) {
      return true;
    }

    // No passcode configured for this report: stay open.
    if (!reportPassword) {
      return true;
    }

    const secret = this.config.get<string>("JWT_SECRET");
    const expected = computeReportUnlockToken(
      consultUniqueId,
      reportPassword,
      secret
    );

    const cookieValue =
      request.cookies?.[`${REPORT_UNLOCK_COOKIE_PREFIX}${consultUniqueId}`];

    if (
      typeof cookieValue === "string" &&
      cookieValue.length === expected.length &&
      timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected))
    ) {
      return true;
    }

    throw new UnauthorizedException("report_locked");
  }
}
