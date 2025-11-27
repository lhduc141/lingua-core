import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'ai_cache' })
export class AiCache extends Model<AiCache> {
  @Column({ type: DataType.UUID, field: 'cache_id', primaryKey: true, allowNull: false })
  declare cacheId: string | null;

  @Column({ type: DataType.TEXT, field: 'owner_type', allowNull: false })
  declare ownerType: string;

  @Column({ type: DataType.TEXT, field: 'kind', allowNull: false })
  declare kind: string;

  @Column({ type: DataType.TEXT, field: 'prompt_hash', allowNull: false })
  declare promptHash: string;

  @Column({ type: DataType.JSONB, field: 'input_json', allowNull: false })
  declare inputJson: any;

  @Column({ type: DataType.JSONB, field: 'output_json', allowNull: false })
  declare outputJson: any;

  @Column({ type: DataType.TEXT, field: 'version', allowNull: true })
  declare version: string | null;

  @Column({ type: DataType.DATE, field: 'expires_at', allowNull: true })
  declare expiresAt: Date | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

}