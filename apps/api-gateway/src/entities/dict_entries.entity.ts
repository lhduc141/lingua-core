import {
	AutoIncrement,
	Column,
	CreatedAt,
	DataType,
	DeletedAt,
	HasMany,
	Model,
	PrimaryKey,
	Scopes,
	Table,
	UpdatedAt,
} from 'sequelize-typescript';
import { DictForms } from './dict_forms.entity';
import { DictSenses } from './dict_senses.entity';
import { DictRelations } from './dict_relations.entity';

// @Scopes(dictionaryScopes)
@Table({ tableName: 'dict_entries' })
export class DictEntries extends Model<DictEntries> {
	@PrimaryKey
	@AutoIncrement
	@Column({ type: DataType.INTEGER, field: 'entry_id', primaryKey: true, allowNull: false })
	declare entryId: number;

	@Column({ type: DataType.TEXT, field: 'lang', allowNull: false })
	declare lang: string;

	@Column({ type: DataType.TEXT, field: 'headword', allowNull: false })
	declare headword: string;

	@Column({ type: DataType.TEXT, field: 'pos', allowNull: true })
	declare pos: string;

	@Column({ type: DataType.TEXT, field: 'ipa', allowNull: true })
	declare ipa: string;

	@Column({ type: DataType.TEXT, field: 'audio_url', allowNull: true })
	declare audioUrl: string | null;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;

	@DeletedAt
	@Column({ type: DataType.DATE, field: 'deleted_at', allowNull: true })
	declare deletedAt: Date;

	// ===== ASSOCIATIONS =====
	@HasMany(() => DictForms, { foreignKey: 'entryId', as: 'forms' })
	declare forms?: DictForms[];

	@HasMany(() => DictSenses, { foreignKey: 'entryId', as: 'senses' })
	declare senses?: DictSenses[];

	@HasMany(() => DictRelations, { foreignKey: 'fromEntryId', as: 'relations' })
	declare relations?: DictRelations[];
}
