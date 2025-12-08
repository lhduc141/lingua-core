import { DocumentBuilder } from '@nestjs/swagger';

export const apiSwaggerConfig = new DocumentBuilder()
	.setTitle('Lingua Panda')
	.setDescription('API Documentation for Lingua Panda Thesis')
	.setVersion('1.0')
	.addBearerAuth(
		{
			type: 'http',
			scheme: 'bearer',
			bearerFormat: 'JWT',
			name: 'Authorization',
			in: 'header',
		},
		'access-token',
	)
	.build();

export default { apiSwaggerConfig };
