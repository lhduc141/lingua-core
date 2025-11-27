import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { LearningPlanItems } from './learning_plan_items.entity';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'study_sessions' })
export class StudySessions extends Model<StudySessions> {
  @Column({ type: DataType.UUID, field: 'session_id', primaryKey: true, allowNull: false })
  declare sessionId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @Column({ type: DataType.DATE, field: 'start_at', allowNull: false })
  declare startAt: Date;

  @Column({ type: DataType.DATE, field: 'end_at', allowNull: true })
  declare endAt: Date | null;

  @ForeignKey(() => LearningPlanItems)
  @Column({ type: DataType.UUID, field: 'plan_item_id', allowNull: true })
  declare planItemId: string;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

  @BelongsTo(() => LearningPlanItems, { foreignKey: 'planItemId' })
  declare learningPlanItem?: LearningPlanItems;

}