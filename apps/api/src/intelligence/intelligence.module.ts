import { Module, Global } from '@nestjs/common';
import { CredibilityService } from './credibility.service';
import { MisinformationService } from './misinformation.service';
import { DeduplicationService } from './deduplication.service';
import { ClusteringService } from './clustering.service';
import { EvidenceFusionService } from './evidence-fusion.service';

@Global()
@Module({
  providers: [
    CredibilityService,
    MisinformationService,
    DeduplicationService,
    ClusteringService,
    EvidenceFusionService,
  ],
  exports: [
    CredibilityService,
    MisinformationService,
    DeduplicationService,
    ClusteringService,
    EvidenceFusionService,
  ],
})
export class IntelligenceModule {}
