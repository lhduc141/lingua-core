import {
	AutoIncrement,
	BelongsTo,
	Column,
	DataType,
	ForeignKey,
	Model,
	PrimaryKey,
	Table,
} from 'sequelize-typescript';
import { DictEntries } from './dict_entries.entity';

// @Scopes(dictionaryScopes)
@Table({ tableName: 'dict_forms' })
export class DictForms extends Model<DictForms> {
	@PrimaryKey
	@AutoIncrement
	@Column({ type: DataType.UUID, field: 'form_id', primaryKey: true, allowNull: false })
	declare formId: string | null;

	@ForeignKey(() => DictEntries)
	@Column({ type: DataType.INTEGER, field: 'entry_id', allowNull: false })
	declare entryId: number;

	@Column({ type: DataType.TEXT, field: 'form', allowNull: false })
	declare form: string;

	@Column({ type: DataType.TEXT, field: 'morph_tag', allowNull: false })
	declare morphTag: string;

	@Column({ type: DataType.BOOLEAN, field: 'is_lemma', allowNull: false, defaultValue: false })
	declare isLemma: string;

	@BelongsTo(() => DictEntries, { foreignKey: 'entryId' })
	declare dictEntry?: DictEntries;
}
