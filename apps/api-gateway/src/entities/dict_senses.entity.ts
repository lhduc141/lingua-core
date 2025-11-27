import {
	BelongsTo,
	Column,
	CreatedAt,
	DataType,
	ForeignKey,
	HasMany,
	Model,
	Table,
	UpdatedAt,
} from 'sequelize-typescript';
import { DictEntries } from './dict_entries.entity';
import { DictExamples } from './dict_examples.entity';

// @Scopes(dictionaryScopes)
@Table({ tableName: 'dict_senses' })
export class DictSenses extends Model<DictSenses> {
	@Column({ type: DataType.UUID, field: 'sense_id', primaryKey: true, allowNull: false })
	declare senseId: string | null;

	@ForeignKey(() => DictEntries)
	@Column({ type: DataType.INTEGER, field: 'entry_id', allowNull: false })
	declare entryId: number;

	@Column({ type: DataType.INTEGER, field: 'order', allowNull: false })
	declare order: number;

	@Column({ type: DataType.TEXT, field: 'short_def', allowNull: false })
	declare shortDef: string;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;

	@BelongsTo(() => DictEntries, { foreignKey: 'entryId' })
	declare dictEntry?: DictEntries;

	@HasMany(() => DictExamples, { foreignKey: 'senseId', as: 'examples' })
	declare examples?: DictExamples[];
}
