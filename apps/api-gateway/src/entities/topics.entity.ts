import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'topics' })
export class Topics extends Model<Topics> {
  @Column({ type: DataType.UUID, field: 'topic_id', primaryKey: true, allowNull: false })
  declare topicId: string | null;

  @Column({ type: DataType.TEXT, field: 'level_hint', allowNull: true })
  declare levelHint: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'author_id', allowNull: true })
  declare authorId: string;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'reviewer_id', allowNull: true })
  declare reviewerId: string;

  @Column({ type: DataType.DATE, field: 'published_at', allowNull: true })
  declare publishedAt: Date | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'authorId' })
  declare user?: Users;

  @BelongsTo(() => Users, { foreignKey: 'reviewerId' })
  declare userRef?: Users;

}