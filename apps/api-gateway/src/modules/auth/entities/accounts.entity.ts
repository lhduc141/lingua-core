import {
	BelongsTo,
	Column,
	CreatedAt,
	DataType,
	Default,
	DeletedAt,
	ForeignKey,
	Model,
	Table,
	UpdatedAt,
} from 'sequelize-typescript';
import { Users } from './users.entity';

@Table({ tableName: 'accounts' })
export class Accounts extends Model<Accounts> {
	@Default(DataType.UUIDV4)
	@Column({ type: DataType.UUID, field: 'account_id', primaryKey: true, allowNull: false })
	declare accountId: string;

	@ForeignKey(() => Users)
	@Column({
		type: DataType.UUID,
		field: 'user_id',
		allowNull: false,
	})
	declare userId: string;

	@Column({ type: DataType.ENUM('local', 'google'), field: 'provider', allowNull: false, defaultValue: 'local' })
	declare provider: string;

	//TODO: Login with Google/Microsoft/... Account
	@Column({
		type: DataType.STRING,
		field: 'provider_account_id',
		allowNull: true,
	})
	declare providerAccountId: string | null;

	@Column({ type: DataType.STRING, field: 'email_login', allowNull: true })
	declare emailLogin: string | null;

	@Column({ type: DataType.TEXT, field: 'password', allowNull: true })
	declare password: string | null;

	@Column({ type: DataType.DATE, field: 'email_verified_at', allowNull: true })
	declare emailVerifiedAt: Date | null;

	@Column({ type: DataType.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true })
	declare isActive: boolean;

	@DeletedAt
	@Column({ type: DataType.DATE, field: 'deleted_at', allowNull: true })
	declare deletedAt: Date | null;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;

	@BelongsTo(() => Users, { foreignKey: 'userId' })
	declare user?: Users;
}
