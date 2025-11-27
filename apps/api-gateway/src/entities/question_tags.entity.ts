import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Questions } from './questions.entity';

@Table({ tableName: 'question_tags' })
export class QuestionTags extends Model<QuestionTags> {
  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.TEXT, field: 'tag', allowNull: false })
  declare tag: string;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

}