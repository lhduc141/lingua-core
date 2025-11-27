import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'user_availabilities' })
export class UserAvailabilities extends Model<UserAvailabilities> {
  @Column({ type: DataType.UUID, field: 'availability_id', primaryKey: true, allowNull: false })
  declare availabilityId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.SMALLINT, field: 'dow', allowNull: false })
  declare dow: number;

  @Column({ type: DataType.INTEGER, field: 'end_minute', allowNull: false })
  declare endMinute: number;

  @Column({ type: DataType.INTEGER, field: 'weight', allowNull: false })
  declare weight: number;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

}