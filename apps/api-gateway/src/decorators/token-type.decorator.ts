import { SetMetadata } from '@nestjs/common';
import { TOKEN_TYPE } from '@app/shared/enums';

export const IS_TOKEN_TYPE = 'isTokenType';

export const TokenType = (tokenType: TOKEN_TYPE) => SetMetadata(IS_TOKEN_TYPE, tokenType);
