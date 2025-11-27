import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { QuestionOptions } from './question_options.entity';

@Table({ tableName: 'option_translations' })
export class OptionTranslations extends Model<OptionTranslations> {
  @ForeignKey(() => QuestionOptions)
  @Column({ type: DataType.UUID, field: 'option_id', allowNull: false })
  declare optionId: string;

  @Column({ type: DataType.TEXT, field: 'locale', allowNull: false })
  declare locale: string;

  @Column({ type: DataType.TEXT, field: 'option_text', allowNull: true })
  declare optionText: string | null;

  @Column({ type: DataType.TEXT, field: 'explanation', allowNull: true })
  declare explanation: string | null;

  @BelongsTo(() => QuestionOptions, { foreignKey: 'optionId' })
  declare questionOption?: QuestionOptions;

}