import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { SrsCards } from './srs_cards.entity';

@Table({ tableName: 'srs_reviews' })
export class SrsReviews extends Model<SrsReviews> {
  @Column({ type: DataType.UUID, field: 'review_id', primaryKey: true, allowNull: false })
  declare reviewId: string | null;

  @ForeignKey(() => SrsCards)
  @Column({ type: DataType.UUID, field: 'card_id', allowNull: false })
  declare cardId: string;

  @Column({ type: DataType.DATE, field: 'reviewed_at', allowNull: false })
  declare reviewedAt: Date;

  @Column({ type: DataType.SMALLINT, field: 'grade', allowNull: false })
  declare grade: number;

  @Column({ type: DataType.INTEGER, field: 'next_interval_days', allowNull: true })
  declare nextIntervalDays: number | null;

  @Column({ type: DataType.DECIMAL, field: 'ease_after', allowNull: true })
  declare easeAfter: number | null;

  @Column({ type: DataType.TEXT, field: 'notes', allowNull: true })
  declare notes: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => SrsCards, { foreignKey: 'cardId' })
  declare srsCard?: SrsCards;

}