import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'rubric_criteria' })
export class RubricCriteria extends Model<RubricCriteria> {
  @Column({ type: DataType.UUID, field: 'criterion_id', primaryKey: true, allowNull: false })
  declare criterionId: string | null;

  @Column({ type: DataType.TEXT, field: 'framework', allowNull: false })
  declare framework: string;

  @Column({ type: DataType.TEXT, field: 'version', allowNull: false })
  declare version: string;

  @Column({ type: DataType.TEXT, field: 'name', allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, field: 'description', allowNull: true })
  declare description: string | null;

}