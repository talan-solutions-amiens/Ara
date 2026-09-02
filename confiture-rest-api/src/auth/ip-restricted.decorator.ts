import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiForbiddenResponse } from "@nestjs/swagger";

import { IpAllowlistGuard } from "./ip-allowlist.guard";

/**
 * Restricts a route (or a whole controller) to IP addresses listed in the
 * ADMIN_IP_ALLOWLIST env var. See IpAllowlistGuard for details.
 */
export function IpRestricted() {
  return applyDecorators(
    ApiForbiddenResponse({
      description: "Your IP address is not allowed to access this resource."
    }),
    UseGuards(IpAllowlistGuard)
  );
}
