import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Scopes, Table } from 'sequelize-typescript';
import { DictSenses } from './dict_senses.entity';

// @Scopes(dictionaryScopes)
@Table({ tableName: 'dict_examples' })
export class DictExamples extends Model<DictExamples> {
	@Column({ type: DataType.UUID, field: 'example_id', primaryKey: true, allowNull: false })
	declare exampleId: string | null;

	@ForeignKey(() => DictSenses)
	@Column({ type: DataType.UUID, field: 'sense_id', allowNull: false })
	declare senseId: string;

	@Column({ type: DataType.TEXT, field: 'locale', allowNull: false })
	declare locale: string;

	@Column({ type: DataType.TEXT, field: 'translation', allowNull: true })
	declare translation: string | null;

	@Column({ type: DataType.TEXT, field: 'example', allowNull: false })
	declare example: string;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@BelongsTo(() => DictSenses, { foreignKey: 'senseId' })
	declare dictSense?: DictSenses;
}
