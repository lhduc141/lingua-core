import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'srs_collections' })
export class SrsCollections extends Model<SrsCollections> {
  @Column({ type: DataType.UUID, field: 'collection_id', primaryKey: true, allowNull: false })
  declare collectionId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @ForeignKey(() => SrsCollections)
  @Column({ type: DataType.UUID, field: 'parent_id', allowNull: true })
  declare parentId: string;

  @Column({ type: DataType.TEXT, field: 'name', allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, field: 'description', allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @Column({ type: DataType.TEXT, field: 'visibility', allowNull: false })
  declare visibility: string;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

  @BelongsTo(() => SrsCollections, { foreignKey: 'parentId' })
  declare srsCollection?: SrsCollections;

}