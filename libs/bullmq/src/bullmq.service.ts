import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class BullmqService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(BullmqService.name);
	private queues = new Map<string, Queue>();
	private workers: Worker[] = [];
	private connection: IORedis;

	onModuleInit() {
		this.connection = new IORedis({
			host: process.env.REDIS_HOST || 'localhost',
			port: Number(process.env.REDIS_PORT || 6379),
			password: process.env.REDIS_PASSWORD || undefined,
			db: Number(process.env.REDIS_DB || 0),
			maxRetriesPerRequest: null, // BullMQ yêu cầu
		});
		this.logger.log('BullMQ Redis connection initialized');
	}

	async onModuleDestroy() {
		for (const worker of this.workers) {
			await worker.close();
		}
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		await this.connection.quit();
	}

	getQueue(name: string): Queue {
		if (!this.queues.has(name)) {
			const q = new Queue(name, {
				connection: this.connection,
				defaultJobOptions: {
					attempts: 3,
					backoff: { type: 'fixed', delay: 30000 }, // retry sau 30s
					removeOnComplete: 100,
					removeOnFail: 500,
				},
			});
			this.queues.set(name, q);
		}
		return this.queues.get(name)!;
	}

	async addJob<T>(queueName: string, jobName: string, data: T): Promise<void> {
		const queue = this.getQueue(queueName);
		await queue.add(jobName, data);
		this.logger.log(`Job added: [${queueName}] ${jobName}`);
	}

	registerWorker<T>(queueName: string, handler: (job: Job<T>) => Promise<void>): Worker<T> {
		const worker = new Worker<T>(queueName, handler, {
			connection: this.connection,
			concurrency: 3,
		});

		worker.on('completed', (job) => {
			this.logger.log(`Job completed: [${queueName}] ${job.name} #${job.id}`);
		});

		worker.on('failed', (job, err) => {
			this.logger.error(`Job failed: [${queueName}] ${job?.name} #${job?.id} — ${err.message}`);
		});

		this.workers.push(worker);
		this.logger.log(`Worker registered for queue: ${queueName}`);
		return worker;
	}
}
