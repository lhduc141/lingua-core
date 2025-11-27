import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Assessments } from './assessments.entity';

@Table({ tableName: 'band_scores' })
export class BandScores extends Model<BandScores> {
  @Column({ type: DataType.UUID, field: 'band_score_id', primaryKey: true, allowNull: false })
  declare bandScoreId: string | null;

  @ForeignKey(() => Assessments)
  @Column({ type: DataType.UUID, field: 'assessment_id', allowNull: false })
  declare assessmentId: string;

  @Column({ type: DataType.TEXT, field: 'skill', allowNull: false })
  declare skill: string;

  @Column({ type: DataType.TEXT, field: 'criterion', allowNull: true })
  declare criterion: string | null;

  @Column({ type: DataType.DECIMAL, field: 'score_numeric', allowNull: true })
  declare scoreNumeric: number | null;

  @Column({ type: DataType.DECIMAL, field: 'score_band', allowNull: true })
  declare scoreBand: number | null;

  @Column({ type: DataType.JSONB, field: 'evidence_json', allowNull: true })
  declare evidenceJson: any | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => Assessments, { foreignKey: 'assessmentId' })
  declare assessment?: Assessments;

}