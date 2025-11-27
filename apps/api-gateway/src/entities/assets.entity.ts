import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'assets' })
export class Assets extends Model<Assets> {
  @Column({ type: DataType.UUID, field: 'asset_id', primaryKey: true, allowNull: false })
  declare assetId: string | null;

  @Column({ type: DataType.TEXT, field: 'owner_type', allowNull: false })
  declare ownerType: string;

  @Column({ type: DataType.TEXT, field: 'kind', allowNull: false })
  declare kind: string;

  @Column({ type: DataType.TEXT, field: 'mime_type', allowNull: true })
  declare mimeType: string | null;

  @Column({ type: DataType.INTEGER, field: 'duration_ms', allowNull: true })
  declare durationMs: number | null;

  @Column({ type: DataType.BIGINT, field: 'size_bytes', allowNull: true })
  declare sizeBytes: string | null;

  @Column({ type: DataType.JSONB, field: 'waveform_json', allowNull: true })
  declare waveformJson: any | null;

  @Column({ type: DataType.JSONB, field: 'meta_json', allowNull: true })
  declare metaJson: any | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
  declare updatedAt: Date;

}