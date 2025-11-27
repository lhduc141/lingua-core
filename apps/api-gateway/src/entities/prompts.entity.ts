import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Users } from '../modules/auth/entities/users.entity';

@Table({ tableName: 'prompts' })
export class Prompts extends Model<Prompts> {
  @Column({ type: DataType.UUID, field: 'prompt_id', primaryKey: true, allowNull: false })
  declare promptId: string | null;

  @Column({ type: DataType.TEXT, field: 'name', allowNull: false })
  declare name: string;

  @Column({ type: DataType.INTEGER, field: 'version', allowNull: false })
  declare version: number;

  @Column({ type: DataType.TEXT, field: 'template', allowNull: false })
  declare template: string;

  @Column({ type: DataType.JSONB, field: 'variables_json', allowNull: false })
  declare variablesJson: any;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, field: 'created_by', allowNull: true })
  declare createdBy: string;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => Users, { foreignKey: 'createdBy' })
  declare user?: Users;

}