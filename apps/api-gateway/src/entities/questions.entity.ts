import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'questions' })
export class Questions extends Model<Questions> {
  @Column({ type: DataType.UUID, field: 'question_id', primaryKey: true, allowNull: false })
  declare questionId: string | null;

  @Column({ type: DataType.TEXT, field: 'skill', allowNull: false })
  declare skill: string;

  @Column({ type: DataType.TEXT, field: 'exam_kind', allowNull: true })
  declare examKind: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'author_id', allowNull: true })
  declare authorId: string;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'reviewer_id', allowNull: true })
  declare reviewerId: string;

  @Column({ type: DataType.DATE, field: 'published_at', allowNull: true })
  declare publishedAt: Date | null;

  @Column({ type: DataType.TEXT, field: 'source_tag', allowNull: true })
  declare sourceTag: string | null;

  @Column({ type: DataType.INTEGER, field: 'time_limit_sec', allowNull: true })
  declare timeLimitSec: number | null;

  @Column({ type: DataType.DECIMAL, field: 'max_score', allowNull: true })
  declare maxScore: number | null;

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