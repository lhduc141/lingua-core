import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'assessments' })
export class Assessments extends Model<Assessments> {
  @Column({ type: DataType.UUID, field: 'assessment_id', primaryKey: true, allowNull: false })
  declare assessmentId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.TEXT, field: 'ref_type', allowNull: false })
  declare refType: string;

  @Column({ type: DataType.DATE, field: 'completed_at', allowNull: true })
  declare completedAt: Date | null;

  @Column({ type: DataType.DECIMAL, field: 'score', allowNull: true })
  declare score: number | null;

  @Column({ type: DataType.TEXT, field: 'display_locale', allowNull: true })
  declare displayLocale: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

}