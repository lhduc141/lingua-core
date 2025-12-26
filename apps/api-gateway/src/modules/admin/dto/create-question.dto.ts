import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==========================================
// ENUMS
// ==========================================

export enum QuestionType {
	// OBJECTIVE (auto-graded)
	MCQ_SINGLE = 'mcq_single',
	MCQ_MULTI = 'mcq_multi',
	FILL_BLANK = 'fill_blank',
	MATCHING = 'matching',
	ORDERING = 'ordering',
	CLOZE_BANK = 'cloze_bank',

	// SUBJECTIVE (AI-graded)
	SHORT_ANSWER = 'short_answer',
	TRANSLATION = 'translation',
	ESSAY = 'essay',
	SPEAKING = 'speaking',
	DICTATION = 'dictation',
}

export enum ExamKind {
	IELTS = 'ielts',
	TOEIC = 'toeic',
	GENERIC = 'generic',
}

export enum ContentStatus {
	DRAFT = 'draft',
	REVIEWED = 'reviewed',
	PUBLISHED = 'published',
	ARCHIVED = 'archived',
}

// ==========================================
// NESTED DTOs
// ==========================================

export class CreateQuestionOptionDto {
	@ApiProperty({
		description: 'Nội dung của option',
		example: 'Paris',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	optionText: string;

	@ApiPropertyOptional({
		description: 'Option này có đúng không?',
		example: true,
		default: false,
	})
	@IsOptional()
	@IsBoolean()
	isCorrect?: boolean;

	@ApiPropertyOptional({
		description: 'Vị trí hiển thị',
		example: 1,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	position?: number;

	@ApiPropertyOptional({
		description: 'Giải thích',
		example: 'Paris là thủ đô của Pháp',
	})
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	explanation?: string;
}

// ==========================================
// MAIN DTO
// ==========================================

export class CreateQuestionDto {
	@ApiPropertyOptional({
		description: 'ID của passage (nếu câu hỏi thuộc Reading)',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@IsOptional()
	@IsUUID()
	passageId?: string;

	@ApiProperty({
		description: 'Loại câu hỏi',
		example: 'mcq_single',
		enum: QuestionType,
	})
	@IsEnum(QuestionType)
	type: QuestionType;

	@ApiPropertyOptional({
		description: 'Độ khó (1-10)',
		example: 5,
		default: 1,
		minimum: 1,
		maximum: 10,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(10)
	difficulty?: number;

	@ApiPropertyOptional({
		description: 'Loại đề thi',
		example: 'generic',
		enum: ExamKind,
		default: ExamKind.GENERIC,
	})
	@IsOptional()
	@IsEnum(ExamKind)
	examKind?: ExamKind;

	@ApiPropertyOptional({
		description: 'Trạng thái',
		example: 'draft',
		enum: ContentStatus,
		default: ContentStatus.DRAFT,
	})
	@IsOptional()
	@IsEnum(ContentStatus)
	status?: ContentStatus;

	@ApiProperty({
		description: 'Nội dung câu hỏi',
		example: 'What is the capital of France?',
	})
	@IsString()
	@IsNotEmpty()
	stemText: string;

	@ApiPropertyOptional({
		description: 'Các options (bắt buộc cho MCQ)',
		type: [CreateQuestionOptionDto],
	})
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateQuestionOptionDto)
	options?: CreateQuestionOptionDto[];

	@ApiPropertyOptional({
		description: 'Thời gian làm bài (giây)',
		example: 120,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	timeLimitSec?: number;

	@ApiPropertyOptional({
		description: 'Điểm tối đa',
		example: 1,
		default: 1,
	})
	@IsOptional()
	@IsInt()
	@Min(0)
	maxScore?: number;

	@ApiPropertyOptional({
		description: 'Tag nguồn',
		example: 'IELTS_2023',
	})
	@IsOptional()
	@IsString()
	@MaxLength(100)
	sourceTag?: string;
}
