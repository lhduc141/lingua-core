import { BelongsTo, Column, CreatedAt, DataType, DeletedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { Attempts } from './attempts.entity';
import { Prompts } from './prompts.entity';

@Table({ tableName: 'attempt_ai_calls' })
export class AttemptAiCalls extends Model<AttemptAiCalls> {
  @Column({ type: DataType.UUID, field: 'id', primaryKey: true, allowNull: false })
  declare id: string | null;

  @ForeignKey(() => Attempts)
  @Column({ type: DataType.UUID, field: 'attempt_id', allowNull: false })
  declare attemptId: string;

  @Column({ type: DataType.TEXT, field: 'provider', allowNull: false })
  declare provider: string;

  @Column({ type: DataType.TEXT, field: 'model', allowNull: false })
  declare model: string;

  @Column({ type: DataType.TEXT, field: 'version', allowNull: true })
  declare version: string | null;

  @ForeignKey(() => Prompts)
  @Column({ type: DataType.UUID, field: 'prompt_id', allowNull: true })
  declare promptId: string;

  @Column({ type: DataType.TEXT, field: 'input_hash', allowNull: true })
  declare inputHash: string | null;

  @Column({ type: DataType.TEXT, field: 'status', allowNull: false })
  declare status: string;

  @ForeignKey(() => AttemptAiCalls)
  @Column({ type: DataType.UUID, field: 'retried_of_call_id', allowNull: true })
  declare retriedOfCallId: string;

  @Column({ type: DataType.INTEGER, field: 'prompt_tokens', allowNull: true })
  declare promptTokens: number | null;

  @Column({ type: DataType.INTEGER, field: 'completion_tokens', allowNull: true })
  declare completionTokens: number | null;

  @Column({ type: DataType.DECIMAL, field: 'cost_usd', allowNull: true })
  declare costUsd: number | null;

  @Column({ type: DataType.INTEGER, field: 'latency_ms', allowNull: true })
  declare latencyMs: number | null;

  @Column({ type: DataType.JSONB, field: 'guardrail_flags', allowNull: true })
  declare guardrailFlags: any | null;

  @Column({ type: DataType.INTEGER, field: 'output_schema_version', allowNull: true })
  declare outputSchemaVersion: number | null;

  @Column({ type: DataType.UUID, field: 'system_prompt_id', allowNull: true })
  declare systemPromptId: string | null;

  @Column({ type: DataType.DECIMAL, field: 'temperature', allowNull: true })
  declare temperature: number | null;

  @Column({ type: DataType.BIGINT, field: 'seed', allowNull: true })
  declare seed: string | null;

  @Column({ type: DataType.JSONB, field: 'tool_calls_json', allowNull: true })
  declare toolCallsJson: any | null;

  @Column({ type: DataType.TEXT, field: 'trace_id', allowNull: true })
  declare traceId: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at', allowNull: false })
  declare createdAt: Date;

  @BelongsTo(() => Attempts, { foreignKey: 'attemptId' })
  declare attempt?: Attempts;

  @BelongsTo(() => Prompts, { foreignKey: 'promptId' })
  declare prompt?: Prompts;

  @BelongsTo(() => AttemptAiCalls, { foreignKey: 'retriedOfCallId' })
  declare attemptAiCall?: AttemptAiCalls;

}