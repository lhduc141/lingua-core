import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { SrsCards } from './srs_cards.entity';
import { SrsCollections } from './srs_collections.entity';

@Table({ tableName: 'srs_collection_cards' })
export class SrsCollectionCards extends Model<SrsCollectionCards> {
  @ForeignKey(() => SrsCollections)
  @Column({ type: DataType.UUID, field: 'collection_id', allowNull: false })
  declare collectionId: string;

  @ForeignKey(() => SrsCards)
  @Column({ type: DataType.UUID, field: 'card_id', allowNull: false })
  declare cardId: string;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => SrsCollections, { foreignKey: 'collectionId' })
  declare srsCollection?: SrsCollections;

  @BelongsTo(() => SrsCards, { foreignKey: 'cardId' })
  declare srsCard?: SrsCards;

}