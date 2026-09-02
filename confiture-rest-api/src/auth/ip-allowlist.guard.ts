import type { Request } from "express";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Restricts access to requests coming from an allowlisted IP address.
 * Configured via the ADMIN_IP_ALLOWLIST env var (comma-separated list of
 * IPs). If the variable is unset or empty, the guard lets everything
 * through (no restriction), which keeps local/dev environments usable.
 *
 * Requires `app.set("trust proxy", ...)` in main.ts so `request.ip`
 * reflects the real client IP behind Upsun's router.
 */
@Injectable()
export class IpAllowlistGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const allowlist = this.getAllowlist();

    if (allowlist.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    return allowlist.includes(request.ip);
  }

  private getAllowlist(): string[] {
    const raw = this.config.get<string>("ADMIN_IP_ALLOWLIST") ?? "";
    return raw
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
  }
}
