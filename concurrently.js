const concurrently = require('concurrently');

const apps = ['api-gateway', 'ai-service']; // liệt kê app bạn muốn chạy
const mode = process.argv[2] ?? '--dev';

const commands = {
	'--dev': (app) => `nest start ${app} --watch`,
	'--start': (app) => `nest start ${app}`,
};

const { result } = concurrently(
	apps.map((app) => ({
		command: commands[mode](app),
		name: app,
	})),
);

result.catch(() => {});
