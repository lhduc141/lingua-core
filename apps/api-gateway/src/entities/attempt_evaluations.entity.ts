import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Attempts } from './attempts.entity';

@Table({ tableName: 'attempt_evaluations' })
export class AttemptEvaluations extends Model<AttemptEvaluations> {
  @Column({ type: DataType.UUID, field: 'id', primaryKey: true, allowNull: false })
  declare id: string | null;

  @ForeignKey(() => Attempts)
  @Column({ type: DataType.UUID, field: 'attempt_id', allowNull: false })
  declare attemptId: string;

  @Column({ type: DataType.TEXT, field: 'eval_type', allowNull: false })
  declare evalType: string;

  @Column({ type: DataType.DECIMAL, field: 'overall_score', allowNull: true })
  declare overallScore: number | null;

  @Column({ type: DataType.JSONB, field: 'evidence_json', allowNull: true })
  declare evidenceJson: any | null;

  @Column({ type: DataType.TEXT, field: 'rubric_version', allowNull: true })
  declare rubricVersion: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => Attempts, { foreignKey: 'attemptId' })
  declare attempt?: Attempts;

}