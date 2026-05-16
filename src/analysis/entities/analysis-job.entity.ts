import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisStatus } from '../enums/analysis-status.enum';

@Entity('analysis_jobs')
export class AnalysisJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'uuid' })
  sessionId: string | null;

  @Column({ nullable: true, type: 'uuid' })
  matchId: string | null;

  @Column()
  videoUrl: string;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({ nullable: true, type: 'text' })
  externalJobId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
