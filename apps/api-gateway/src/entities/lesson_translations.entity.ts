import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Lessons } from './lessons.entity';

@Table({ tableName: 'lesson_translations' })
export class LessonTranslations extends Model<LessonTranslations> {
  @ForeignKey(() => Lessons)
  @Column({ type: DataType.UUID, field: 'lesson_id', allowNull: false })
  declare lessonId: string;

  @Column({ type: DataType.TEXT, field: 'locale', allowNull: false })
  declare locale: string;

  @Column({ type: DataType.TEXT, field: 'title', allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, field: 'description', allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.JSONB, field: 'content_json', allowNull: false })
  declare contentJson: any;

  @Column({ type: DataType.INTEGER, field: 'schema_version', allowNull: false })
  declare schemaVersion: number;

  @BelongsTo(() => Lessons, { foreignKey: 'lessonId' })
  declare lesson?: Lessons;

}