import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from './users.entity';

@Table({ tableName: 'profiles' })
export class Profiles extends Model<Profiles> {
  @Column({ type: DataType.UUID, field: 'profile_id', primaryKey: true, allowNull: false })
  declare profileId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.TEXT, field: 'full_name', allowNull: true })
  declare fullName: string | null;

  @Column({ type: DataType.DATEONLY, field: 'dob', allowNull: true })
  declare dob: Date | null;

  @Column({ type: DataType.TEXT, field: 'gender', allowNull: true })
  declare gender: string | null;

  @Column({ type: DataType.TEXT, field: 'level_note', allowNull: true })
  declare levelNote: string | null;

  @Column({ type: DataType.TEXT, field: 'goal_note', allowNull: true })
  declare goalNote: string | null;

  @Column({ type: DataType.BOOLEAN, field: 'is_active', allowNull: false })
  declare isActive: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

}