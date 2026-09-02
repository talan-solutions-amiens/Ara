import type { Request, Response } from "express";
import {
  Body,
  Controller,
  Get,
  GoneException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiOkResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { AuditExportService } from "./audit-export.service";
import { AuditService } from "./audit.service";
import { AuditReportDto } from "./dto/audit-report.dto";
import { StatementDto } from "./dto/entities/statement.dto";
import { UnlockReportDto } from "./dto/requests/unlock-report.dto";
import {
  computeReportUnlockToken,
  REPORT_UNLOCK_COOKIE_PREFIX,
  ReportAccessGuard
} from "./report-access.guard";

const UNLOCK_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

@Controller("reports")
@ApiTags("Audits")
export class ReportsController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportService: AuditExportService,
    private readonly config: ConfigService
  ) {}

  /**
   * Tells whether a report is protected by a passcode and, if so, whether
   * the current visitor already unlocked it (valid cookie).
   */
  @Get("/:consultUniqueId/lock-status")
  @ApiOkResponse({ description: "Whether the report is locked for this visitor." })
  async getLockStatus(
    @Param("consultUniqueId") consultUniqueId: string,
    @Req() req: Request
  ) {
    const reportPassword =
      await this.auditService.getReportPasswordByConsultId(consultUniqueId);

    if (reportPassword === undefined) {
      await this.sendAuditNotFoundStatus(consultUniqueId);
    }

    if (!reportPassword) {
      return { locked: false };
    }

    const expected = computeReportUnlockToken(
      consultUniqueId,
      reportPassword,
      this.config.get<string>("JWT_SECRET")
    );
    const cookieValue =
      req.cookies?.[`${REPORT_UNLOCK_COOKIE_PREFIX}${consultUniqueId}`];

    return { locked: cookieValue !== expected };
  }

  /** Unlocks a password-protected report by setting an access cookie. */
  @Post("/:consultUniqueId/unlock")
  @HttpCode(200)
  @ApiOkResponse({ description: "The report was unlocked." })
  @ApiUnauthorizedResponse({ description: "Wrong password." })
  async unlockReport(
    @Param("consultUniqueId") consultUniqueId: string,
    @Body() body: UnlockReportDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const reportPassword =
      await this.auditService.getReportPasswordByConsultId(consultUniqueId);

    if (reportPassword === undefined) {
      await this.sendAuditNotFoundStatus(consultUniqueId);
    }

    if (!reportPassword || reportPassword !== body.password) {
      throw new UnauthorizedException("wrong_password");
    }

    const token = computeReportUnlockToken(
      consultUniqueId,
      reportPassword,
      this.config.get<string>("JWT_SECRET")
    );

    res.cookie(`${REPORT_UNLOCK_COOKIE_PREFIX}${consultUniqueId}`, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: UNLOCK_COOKIE_MAX_AGE_MS
    });

    return { unlocked: true };
  }

  /** Get final report data for a particular audit. */
  @Get("/:consultUniqueId")
  @UseGuards(ReportAccessGuard)
  @ApiOkResponse({ description: "The audit was found.", type: AuditReportDto })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  @ApiUnauthorizedResponse({ description: "The report is protected by a passcode." })
  async getAuditReport(@Param("consultUniqueId") consultUniqueId: string): Promise<AuditReportDto> {
    const report = await this.auditService.getAuditReportData(consultUniqueId);

    if (!report) {
      await this.sendAuditNotFoundStatus(consultUniqueId);
    }

    return report;
  }

  /** Get final report data for a particular audit. */
  @Get("/:consultUniqueId/exports/csv")
  @UseGuards(ReportAccessGuard)
  @ApiOkResponse({ description: "The audit was found." })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  @ApiUnauthorizedResponse({ description: "The report is protected by a passcode." })
  async getCsvExport(@Param("consultUniqueId") consultUniqueId: string) {
    const file =
      await this.auditExportService.getCsvExportWithConsultId(consultUniqueId);

    if (!file) {
      await this.sendAuditNotFoundStatus(consultUniqueId);
    }

    return file;
  }

  @Get("/:consultUniqueId/declaration")
  @UseGuards(ReportAccessGuard)
  @ApiOkResponse({ description: "The audit was found.", type: StatementDto })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  @ApiUnauthorizedResponse({ description: "The report is protected by a passcode." })
  async getAuditAccessibilityStatement(
    @Param("consultUniqueId") consultUniqueId: string
  ): Promise<StatementDto>
  {
    const statement = await this.auditService.getAuditStatementWithConsultId(consultUniqueId);

    if (!statement) {
      await this.sendAuditNotFoundStatus(consultUniqueId);
    }

    return statement;
  }

  /**
   * Send 404 (Not Found) status for audits that never existed
   * and 410 (Gone) for audits that existed but were deleted.
   */
  private async sendAuditNotFoundStatus(consultUniqueId: string) {
    if (
      await this.auditService.checkIfAuditWasDeletedWithConsultId(
        consultUniqueId
      )
    ) {
      throw new GoneException();
    } else {
      throw new NotFoundException();
    }
  }
}
