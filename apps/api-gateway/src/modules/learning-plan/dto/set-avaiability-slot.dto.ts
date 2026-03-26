import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AvailabilitySlotDto {
	@ApiProperty({ description: 'Day of week (0=Sun, 1=Mon, ..., 6=Sat)', minimum: 0, maximum: 6 })
	@IsInt()
	@Min(0)
	@Max(6)
	dow: number;

	@ApiProperty({ description: 'Start time in minutes from midnight (e.g. 480 = 8:00 AM)', minimum: 0, maximum: 1439 })
	@IsInt()
	@Min(0)
	@Max(1439)
	startMinute: number;

	@ApiProperty({ description: 'End time in minutes from midnight (e.g. 600 = 10:00 AM)', minimum: 0, maximum: 1440 })
	@IsInt()
	@Min(0)
	@Max(1440)
	endMinute: number;
}
