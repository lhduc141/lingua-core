import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Assets } from './assets.entity';
import { ExamSections } from './exam_sections.entity';
import { Questions } from './questions.entity';

@Table({ tableName: 'exam_section_questions' })
export class ExamSectionQuestions extends Model<ExamSectionQuestions> {
  @Column({ type: DataType.UUID, field: 'id', primaryKey: true, allowNull: false })
  declare id: string | null;

  @ForeignKey(() => ExamSections)
  @Column({ type: DataType.UUID, field: 'exam_section_id', allowNull: false })
  declare examSectionId: string;

  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.INTEGER, field: 'question_version', allowNull: false })
  declare questionVersion: number;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @Column({ type: DataType.TEXT, field: 'group_key', allowNull: true })
  declare groupKey: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => ExamSections, { foreignKey: 'examSectionId' })
  declare examSection?: ExamSections;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

  @BelongsTo(() => Assets, { foreignKey: 'grouping' })
  declare asset?: Assets;

}