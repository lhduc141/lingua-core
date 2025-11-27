import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'notifications' })
export class Notifications extends Model<Notifications> {
  @Column({ type: DataType.UUID, field: 'notification_id', primaryKey: true, allowNull: false })
  declare notificationId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.TEXT, field: 'channel', allowNull: false })
  declare channel: string;

  @Column({ type: DataType.SMALLINT, field: 'priority', allowNull: false })
  declare priority: number;

  @Column({ type: DataType.DATE, field: 'scheduled_at', allowNull: true })
  declare scheduledAt: Date | null;

  @Column({ type: DataType.DATE, field: 'sent_at', allowNull: true })
  declare sentAt: Date | null;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

}