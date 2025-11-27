import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Lessons } from './lessons.entity';
import { Questions } from './questions.entity';

@Table({ tableName: 'lesson_questions' })
export class LessonQuestions extends Model<LessonQuestions> {
  @ForeignKey(() => Lessons)
  @Column({ type: DataType.UUID, field: 'lesson_id', allowNull: false })
  declare lessonId: string;

  @ForeignKey(() => Questions)
  @Column({ type: DataType.UUID, field: 'question_id', allowNull: false })
  declare questionId: string;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @BelongsTo(() => Lessons, { foreignKey: 'lessonId' })
  declare lesson?: Lessons;

  @BelongsTo(() => Questions, { foreignKey: 'questionId' })
  declare question?: Questions;

}