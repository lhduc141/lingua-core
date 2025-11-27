import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { AttemptEvaluations } from './attempt_evaluations.entity';

@Table({ tableName: 'eval_dimensions' })
export class EvalDimensions extends Model<EvalDimensions> {
  @Column({ type: DataType.UUID, field: 'eval_id', primaryKey: true, allowNull: false })
  declare evalId: string | null;

  @ForeignKey(() => AttemptEvaluations)
  @Column({ type: DataType.UUID, field: 'attempt_eval_id', allowNull: false })
  declare attemptEvalId: string;

  @Column({ type: DataType.TEXT, field: 'name', allowNull: false })
  declare name: string;

  @Column({ type: DataType.DECIMAL, field: 'score', allowNull: true })
  declare score: number | null;

  @Column({ type: DataType.JSONB, field: 'evidence_json', allowNull: true })
  declare evidenceJson: any | null;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @BelongsTo(() => AttemptEvaluations, { foreignKey: 'attemptEvalId' })
  declare attemptEvaluation?: AttemptEvaluations;

}