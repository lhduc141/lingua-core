import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'srs_cards' })
export class SrsCards extends Model<SrsCards> {
  @Column({ type: DataType.UUID, field: 'card_id', primaryKey: true, allowNull: false })
  declare cardId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.TEXT, field: 'ref_type', allowNull: true })
  declare refType: string | null;

  @Column({ type: DataType.TEXT, field: 'note', allowNull: true })
  declare note: string | null;

  @Column({ type: DataType.DECIMAL, field: 'ease', allowNull: false })
  declare ease: number;

  @Column({ type: DataType.INTEGER, field: 'interval_days', allowNull: false })
  declare intervalDays: number;

  @Column({ type: DataType.DATE, field: 'due_at', allowNull: true })
  declare dueAt: Date | null;

  @Column({ type: DataType.DATE, field: 'last_review_at', allowNull: true })
  declare lastReviewAt: Date | null;

  @Column({ type: DataType.JSONB, field: 'stats_json', allowNull: false })
  declare statsJson: any;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

}