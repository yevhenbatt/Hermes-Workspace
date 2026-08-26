import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const offboardingReviewDecisions = ['approved', 'rejected'] as const;
export type OffboardingReviewDecision = (typeof offboardingReviewDecisions)[number];

export class ReviewOffboardingManifestDto {
  @ApiProperty({ enum: offboardingReviewDecisions })
  @IsIn(offboardingReviewDecisions)
  decision!: OffboardingReviewDecision;
}
