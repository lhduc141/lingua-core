import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Exams } from './exams.entity';

@Table({ tableName: 'exam_sections' })
export class ExamSections extends Model<ExamSections> {
  @Column({ type: DataType.UUID, field: 'section_id', primaryKey: true, allowNull: false })
  declare sectionId: string | null;

  @ForeignKey(() => Exams)
  @Column({ type: DataType.UUID, field: 'exam_id', allowNull: false })
  declare examId: string;

  @Column({ type: DataType.TEXT, field: 'name', allowNull: false })
  declare name: string;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @Column({ type: DataType.INTEGER, field: 'duration_minutes', allowNull: true })
  declare durationMinutes: number | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Exams, { foreignKey: 'examId' })
  declare exam?: Exams;

}