import { Transform } from 'class-transformer';
import moment from 'moment';

type Options = {
    format?: string;
};

export const TransformDate = (options?: Options) => {
    return Transform(({ value }: { value?: string }) => {
        return !value ? value : transformDate(value, options);
    });
};

export function transformDate(value: string, options?: Options): Date {
    return moment(value, options?.format).toDate();
}