import { IsString } from "class-validator";

export class UnlockReportDto {
  /**
   * @example "renard-tulipe-42"
   */
  @IsString()
  password: string;
}
