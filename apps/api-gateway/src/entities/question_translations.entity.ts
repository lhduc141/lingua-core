import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Questions } from './questions.entity';

@Table({ tableName: 'question_translations' })
export class QuestionTranslations extends Model<QuestionTranslations> {
  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.TEXT, field: 'locale', allowNull: false })
  declare locale: string;

  @Column({ type: DataType.TEXT, field: 'stem_text', allowNull: true })
  declare stemText: string | null;

  @Column({ type: DataType.JSONB, field: 'content_json', allowNull: false })
  declare contentJson: any;

  @Column({ type: DataType.INTEGER, field: 'schema_version', allowNull: false })
  declare schemaVersion: number;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

}