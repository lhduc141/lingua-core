import { Column, CreatedAt, DataType, Default, DeletedAt, Model, Table, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'users', timestamps: true, paranoid: true, underscored: true })
export class Users extends Model<Users> {
	@Default(DataType.UUIDV4)
	@Column({ type: DataType.UUID, field: 'user_id', primaryKey: true, allowNull: false })
	declare userId: string;

	@Column({ type: DataType.TEXT, field: 'username', allowNull: false })
	declare username: string;

	@Column({ type: DataType.STRING, field: 'primary_email', allowNull: false })
	declare primaryEmail: string | null;

	@Column({ type: DataType.BOOLEAN, field: 'is_admin', allowNull: false, defaultValue: false })
	declare isAdmin: boolean;

	@Column({ type: DataType.BOOLEAN, field: 'is_active', allowNull: false, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.DATE, field: 'last_login_at', allowNull: true })
	declare lastLoginAt: Date | null;

	@DeletedAt
	@Column({ type: DataType.DATE, field: 'deleted_at', allowNull: true })
	declare deletedAt: Date;

	@CreatedAt
	@Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
	declare createdAt: Date;

	@UpdatedAt
	@Column({ type: DataType.DATE, field: 'updated_at', allowNull: false })
	declare updatedAt: Date;
}
