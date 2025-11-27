/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

const colors = {
	white: '\x1b[37m',
	yellow: '\x1b[33m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	red: '\x1b[31m',
	green: '\x1b[32m',
};

const SCHEMA = process.env.DATABASE_SCHEMA || 'public';

/** @type {import('sequelize').Options} */
const sequelizeOptions = {
	username: process.env.DATABASE_USERNAME,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_DATABASE,
	host: process.env.DATABASE_HOST,
	port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 5432,
	dialect: process.env.DATABASE_DIALECT || 'postgres', // expect 'postgres'
	benchmark: true,
	logging:
		process.env.DATABASE_LOGGING === 'true'
			? (sql, timing) => console.log(`${sql.replaceAll(/\s+/g, ' ')} ${colors.yellow}+${timing}ms${colors.white}`)
			: false,
	dialectOptions: {
		prependSearchPath: true,
	},
	define: { schema: SCHEMA },
	schema: SCHEMA,
	searchPath: SCHEMA,
};

class DatabaseCli {
	_sequelize;
	_metaModel;
	_migrationsPath = path.join(__dirname, 'migrations');
	_seedersPath = path.join(__dirname, 'seeders');

	constructor() {
		const sequelize = new Sequelize(sequelizeOptions);

		// Bảng meta để đánh dấu file đã chạy
		this._metaModel = sequelize.define(
			'_migrations',
			{
				name: {
					type: DataTypes.STRING,
					allowNull: false,
					primaryKey: true,
				},
				createdAt: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: DataTypes.NOW,
				},
			},
			{
				tableName: '_migrations',
				schema: SCHEMA,
				timestamps: false,
			},
		);

		this._sequelize = sequelize;
	}

	async init() {
		// Tạo schema nếu cần (Postgres)
		if (this._sequelize.getDialect() === 'postgres') {
			try {
				await this._sequelize.createSchema(SCHEMA);
				console.log(`${colors.cyan}Created schema "${SCHEMA}"${colors.white}`);
			} catch (e) {
				// schema có thể đã tồn tại — bỏ qua
			}
		}

		await this._sequelize.authenticate();
		await this._sequelize.sync(); // tạo bảng _migrations nếu chưa có
	}

	_parseArgs() {
		const arg = process.argv[2] || '';
		const migrateFlag = !arg || arg === '--migrate' || arg === '--migration';
		const seedFlag = !arg || arg === '--seed';

		let runMigrate = migrateFlag;
		let runSeed = seedFlag;

		if (arg === '--migrate' || arg === '--migration') {
			runSeed = false;
		} else if (arg === '--seed') {
			runMigrate = false;
		}

		return { runMigrate, runSeed };
	}

	async run() {
		const { runMigrate, runSeed } = this._parseArgs();

		if (runMigrate) {
			await this.migrate(this._migrationsPath, 'migrations');
		}
		if (runSeed) {
			await this.migrate(this._seedersPath, 'seeders');
		}
	}

	_collectSqlFiles(dirPath) {
		if (!fs.existsSync(dirPath)) return [];

		return (
			fs
				.readdirSync(dirPath, {})
				.filter((file) => file.toLowerCase().endsWith('.sql'))
				// sort đảm bảo 0000_..., 0100_... chạy trước 0200_...
				.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
				.map((fileName) => ({
					fileName,
					filePath: path.join(dirPath, fileName),
				}))
		);
	}

	async migrate(dirPath, label) {
		const files = this._collectSqlFiles(dirPath);
		if (files.length === 0) {
			console.log(`${colors.yellow}[${label}] No .sql files in ${dirPath}${colors.white}`);
			return;
		}

		let applied = 0;
		let skipped = 0;

		for (const { fileName, filePath } of files) {
			const ok = await this.execute(fileName, filePath);
			if (ok === true) applied++;
			else if (ok === false) skipped++;
		}

		console.log(
			`${colors.green}[${label}] Applied: ${applied}${colors.white} | ${colors.cyan}Skipped: ${skipped}${colors.white}`,
		);
	}

	async execute(fileName, filePath) {
		console.log(`${colors.magenta}${fileName}${colors.white}`);
		try {
			const databaseMeta = await this._metaModel.findByPk(fileName);
			if (databaseMeta) {
				// đã chạy rồi
				return false;
			}

			const rawQuery = fs.readFileSync(filePath, 'utf8');

			await this._sequelize.transaction(async (t) => {
				// đảm bảo search_path đúng trong transaction (phòng trường hợp client không set)
				if (this._sequelize.getDialect() === 'postgres' && SCHEMA) {
					await this._sequelize.query(`SET search_path TO "${SCHEMA}";`, { transaction: t });
				}

				await this._sequelize.query(rawQuery, { transaction: t });
				await this._metaModel.create({ name: fileName, createdAt: new Date() }, { transaction: t });
			});

			return true;
		} catch (err) {
			console.error(`${colors.red}Failed at file: ${fileName}${colors.white}`);
			console.error(err);
			return undefined;
		}
	}
}

async function bootstrap() {
	try {
		const databaseCli = new DatabaseCli();
		await databaseCli.init();
		await databaseCli.run();
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}
bootstrap();
