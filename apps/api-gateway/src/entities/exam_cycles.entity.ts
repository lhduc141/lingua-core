import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'exam_cycles' })
export class ExamCycles extends Model<ExamCycles> {
  @Column({ type: DataType.UUID, field: 'cycle_id', primaryKey: true, allowNull: false })
  declare cycleId: string | null;

  @Column({ type: DataType.TEXT, field: 'label', allowNull: false })
  declare label: string;

  @Column({ type: DataType.TEXT, field: 'kind', allowNull: true })
  declare kind: string | null;

  @Column({ type: DataType.DATEONLY, field: 'end_date', allowNull: true })
  declare endDate: Date | null;

  @Column({ type: DataType.TEXT, field: 'notes', allowNull: true })
  declare notes: string | null;

}