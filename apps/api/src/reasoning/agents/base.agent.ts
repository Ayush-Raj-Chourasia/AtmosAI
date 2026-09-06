import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type AgentTrace = {
  step: string;
  input: any;
  output: any;
  model: string;
  timestamp: string;
};

export abstract class GeminiAgent<TInput, TOutput> {
  protected abstract readonly logger: Logger;
  protected abstract readonly role: string;
  protected abstract readonly model: string;

  constructor(protected readonly gemini: OpenAI) { }

  abstract buildPrompt(input: TInput): string;

  // New: Define available tools for this agent
  protected tools?: any[];
  // New: Handle tool execution (basic registry pattern)
  protected async executeTool?(name: string, args: any): Promise<any>;

  async run(input: TInput): Promise<{ result: TOutput; trace: AgentTrace }> {
    const prompt = this.buildPrompt(input);
    const messages: any[] = [{ role: 'user', content: prompt }];
    
    try {
      this.logger.debug(`[${this.role}] analyzing...`);
      
      // First turn
      let completion = await this.gemini.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: this.tools,
        response_format: { type: 'json_object' },
      });

      let msg = completion.choices[0].message;

      // Handle Tool Calls (Loop) - simplistic single-turn support for now or loop if needed
      // Gemini 3 / OpenAI compatible loop
      if (msg.tool_calls && msg.tool_calls.length > 0 && this.executeTool) {
        this.logger.debug(`[${this.role}] Tool calls detected: ${msg.tool_calls.length}`);

        // Append assistant message with tool calls
        messages.push(msg);

        // Process each call
        for (const toolCall of msg.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          this.logger.debug(`[${this.role}] Executing tool ${fnName}...`);

          try {
            const toolResult = await this.executeTool(fnName, args);

            // Append tool result message
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          } catch (err: any) {
            this.logger.error(`Tool execution failed for ${fnName}`, err);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: err.message })
            });
          }
        }

        // Second turn: Get final response after tool execution
        completion = await this.gemini.chat.completions.create({
          model: this.model,
          messages: messages,
          // tools: this.tools, // Optional: keep tools if we want multi-step, but usually final answer is next
          response_format: { type: 'json_object' },
        });
        msg = completion.choices[0].message;
      }

      const content = msg.content;
      if (!content) throw new Error('Empty response from AI');

      const result = JSON.parse(content) as TOutput;
      
      const trace: AgentTrace = {
        step: this.role,
        input,
        output: result,
        model: this.model,
        timestamp: new Date().toISOString(),
      };

      return { result, trace };

    } catch (error) {
      this.logger.error(`[${this.role}] Agent Failed:`, error);
      throw error;
    }
  }
}
