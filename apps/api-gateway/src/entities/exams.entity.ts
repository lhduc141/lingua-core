import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { ExamCycles } from './exam_cycles.entity';

@Table({ tableName: 'exams' })
export class Exams extends Model<Exams> {
  @Column({ type: DataType.UUID, field: 'exam_id', primaryKey: true, allowNull: false })
  declare examId: string | null;

  @Column({ type: DataType.TEXT, field: 'title', allowNull: false })
  declare title: string;

  @ForeignKey(() => ExamCycles)
  @Column({ type: DataType.UUID, field: 'cycle_id', allowNull: true })
  declare cycleId: string;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

  @Column({ type: DataType.TEXT, field: 'description', allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.TEXT, field: 'category', allowNull: true })
  declare category: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => ExamCycles, { foreignKey: 'cycleId' })
  declare examCycle?: ExamCycles;

}