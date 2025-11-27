import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DatetimeDto {
    @ApiProperty()
    @Expose()
    datetime: Date;

    @ApiProperty()
    @Expose()
    timezone: string;
}
