import { applyDecorators } from '@nestjs/common';
import { ApiTags, DocumentBuilder } from '@nestjs/swagger';
import { TagObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const apiSwaggerConfig = new DocumentBuilder()
	.setTitle('LinguaPandaCore ')
	.setVersion('1.0.0')
	.setDescription('Tài liệu API hệ thống')
	// .addBearerAuth({ in: 'header', type: 'http' }, 'accessToken')
	// .addSecurityRequirements('accessToken')
	.build();

export const ApiTag = (tagObject: TagObject) => {
    (apiSwaggerConfig.tags ??= []).push(tagObject);
    return applyDecorators(ApiTags(tagObject.name));
};
