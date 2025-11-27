import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Questions } from './questions.entity';

@Table({ tableName: 'question_options' })
export class QuestionOptions extends Model<QuestionOptions> {
  @Column({ type: DataType.UUID, field: 'option_id', primaryKey: true, allowNull: false })
  declare optionId: string | null;

  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.DECIMAL, field: 'weight', allowNull: false })
  declare weight: number;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

}