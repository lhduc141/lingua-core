import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Assessments } from './assessments.entity';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'learning_plan_items' })
export class LearningPlanItems extends Model<LearningPlanItems> {
  @Column({ type: DataType.UUID, field: 'item_id', primaryKey: true, allowNull: false })
  declare itemId: string | null;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'user_id', allowNull: false })
  declare userId: string;

  @ForeignKey(() => LearningPlanItems)
  @Column({ type: DataType.UUID, field: 'parent_item_id', allowNull: true })
  declare parentItemId: string;

  @Column({ type: DataType.TEXT, field: 'title', allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, field: 'item_type', allowNull: false })
  declare itemType: string;

  @Column({ type: DataType.UUID, field: 'ref_id', allowNull: true })
  declare refId: string | null;

  @Column({ type: DataType.TEXT, field: 'target_level', allowNull: true })
  declare targetLevel: string | null;

  @Column({ type: DataType.DATEONLY, field: 'due_date', allowNull: true })
  declare dueDate: Date | null;

  @Column({ type: DataType.INTEGER, field: 'due_window_days', allowNull: true })
  declare dueWindowDays: number | null;

  @Column({ type: DataType.INTEGER, field: 'position', allowNull: false })
  declare position: number;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

  @ForeignKey(() => Assessments)
  @Column({ type: DataType.UUID, field: 'source_assessment_id', allowNull: true })
  declare sourceAssessmentId: string;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'userId' })
  declare user?: Users;

  @BelongsTo(() => LearningPlanItems, { foreignKey: 'parentItemId' })
  declare learningPlanItem?: LearningPlanItems;

  @BelongsTo(() => Assessments, { foreignKey: 'sourceAssessmentId' })
  declare assessment?: Assessments;

}