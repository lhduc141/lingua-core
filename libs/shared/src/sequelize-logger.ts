import { Logger } from '@nestjs/common';
import { colors } from '@app/shared/constants';

export const sequelizeLogger = () => {
	const logger = new Logger('SQL');

	return (sql: string, timing?: number) => {
		logger.debug(`${sql.replaceAll(/\s+/g, ' ')} ${colors.FgYellow}+${timing}ms`);
	};
};
