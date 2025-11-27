import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Questions } from './questions.entity';

@Table({ tableName: 'question_payloads' })
export class QuestionPayloads extends Model<QuestionPayloads> {
  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', primaryKey: true, allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.INTEGER, field: 'schema_version', allowNull: false })
  declare schemaVersion: number;

  @Column({ type: DataType.JSONB, field: 'config_json', allowNull: false })
  declare configJson: any;

  @Column({ type: DataType.JSONB, field: 'answer_keys_json', allowNull: false })
  declare answerKeysJson: any;

  @Column({ type: DataType.JSONB, field: 'scoring_json', allowNull: false })
  declare scoringJson: any;

  @Column({ type: DataType.JSONB, field: 'validation_json', allowNull: false })
  declare validationJson: any;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

}