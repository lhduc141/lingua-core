import { DocumentBuilder } from '@nestjs/swagger';

export const apiSwaggerConfig = new DocumentBuilder()
	.setTitle('My API')
	.setDescription('API documentation for my application')
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
