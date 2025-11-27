import {
	BelongsTo,
	Column,
	CreatedAt,
	DataType,
	DeletedAt,
	ForeignKey,
	Model,
	Scopes,
	Table,
	UpdatedAt,
} from 'sequelize-typescript';
import { DictEntries } from './dict_entries.entity';

// @Scopes(dictionaryScopes)
@Table({ tableName: 'dict_relations' })
export class DictRelations extends Model<DictRelations> {
	@Column({ type: DataType.INTEGER, field: 'relation_id', primaryKey: true, allowNull: false })
	declare relationId: number;

	@ForeignKey(() => DictEntries)
	@Column({ type: DataType.INTEGER, field: 'from_entry_id', allowNull: false })
	declare fromEntryId: number;

	@ForeignKey(() => DictEntries)
	@Column({ type: DataType.INTEGER, field: 'to_entry_id', allowNull: false })
	declare toEntryId: number;

	@Column({ type: DataType.TEXT, field: 'kind', allowNull: false })
	declare kind: string;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;

	@DeletedAt
	@Column({ type: DataType.DATE, field: 'deleted_at', allowNull: true })
	declare deletedAt: Date;

	@BelongsTo(() => DictEntries, { as: 'dictEntry', foreignKey: 'fromEntryId', targetKey: 'entryId' })
	declare dictEntry?: DictEntries;

	@BelongsTo(() => DictEntries, { as: 'dictEntryRef', foreignKey: 'toEntryId', targetKey: 'entryId' })
	declare dictEntryRef?: DictEntries;
}
