import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Topics } from './topics.entity';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'lessons' })
export class Lessons extends Model<Lessons> {
  @Column({ type: DataType.UUID, field: 'lesson_id', primaryKey: true, allowNull: false })
  declare lessonId: string | null;

  @ForeignKey(() => Topics)
  @Column({ type: DataType.UUID, field: 'topic_id', allowNull: false })
  declare topicId: string;

  @Column({ type: DataType.INTEGER, field: 'version', allowNull: false })
  declare version: number;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

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

  @BelongsTo(() => Topics, { foreignKey: 'topicId' })
  declare topic?: Topics;

  @BelongsTo(() => Users, { foreignKey: 'authorId' })
  declare user?: Users;

  @BelongsTo(() => Users, { foreignKey: 'reviewerId' })
  declare userRef?: Users;

}