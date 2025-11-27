import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Topics } from './topics.entity';

@Table({ tableName: 'topic_translations' })
export class TopicTranslations extends Model<TopicTranslations> {
  @ForeignKey(() => Topics)
  @Column({ type: DataType.UUID, field: 'topic_id', allowNull: false })
  declare topicId: string;

  @Column({ type: DataType.TEXT, field: 'locale', allowNull: false })
  declare locale: string;

  @Column({ type: DataType.TEXT, field: 'title', allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, field: 'description', allowNull: true })
  declare description: string | null;

  @BelongsTo(() => Topics, { foreignKey: 'topicId' })
  declare topic?: Topics;

}