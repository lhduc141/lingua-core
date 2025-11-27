import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Attempts } from './attempts.entity';
import { QuestionOptions } from './question_options.entity';

@Table({ tableName: 'attempt_answers' })
export class AttemptAnswers extends Model<AttemptAnswers> {
  @ForeignKey(() => Attempts)
  @Column({ type: DataType.UUID, field: 'attempt_id', allowNull: false })
  declare attemptId: string;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @ForeignKey(() => QuestionOptions)
  @Column({ type: DataType.UUID, field: 'option_id', allowNull: true })
  declare optionId: string;

  @Column({ type: DataType.TEXT, field: 'text_answer', allowNull: true })
  declare textAnswer: string | null;

  @Column({ type: DataType.DECIMAL, field: 'numeric_answer', allowNull: true })
  declare numericAnswer: number | null;

  @Column({ type: DataType.JSONB, field: 'json_answer', allowNull: true })
  declare jsonAnswer: any | null;

  @BelongsTo(() => Attempts, { foreignKey: 'attemptId' })
  declare attempt?: Attempts;

  @BelongsTo(() => QuestionOptions, { foreignKey: 'optionId' })
  declare questionOption?: QuestionOptions;

}