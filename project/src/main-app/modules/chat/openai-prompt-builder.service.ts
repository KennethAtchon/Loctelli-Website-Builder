import { Injectable } from '@nestjs/common';

/**
 * Builder for constructing the system prompt for OpenAI API requests.
 * Migrated from Python OpenAIPromptBuilder class
 */
@Injectable()
export class OpenAIPromptBuilderService {
  private parts: string[] = [];

  /**
   * Sets the role for the AI assistant
   * @param role The role description
   * @returns The builder instance for chaining
   */
  setRole(role: string): OpenAIPromptBuilderService {
    this.parts.push(`Role: ${role}`);
    return this;
  }

  /**
   * Adds an instruction to the prompt
   * @param instruction The instruction text
   * @returns The builder instance for chaining
   */
  addInstruction(instruction: string): OpenAIPromptBuilderService {
    this.parts.push(`Instruction: ${instruction}`);
    return this;
  }

  /**
   * Adds context information to the prompt
   * @param context The context text
   * @returns The builder instance for chaining
   */
  addContext(context: string): OpenAIPromptBuilderService {
    this.parts.push(`Context: ${context}`);
    return this;
  }

  /**
   * Adds a custom labeled section to the prompt
   * @param label The section label
   * @param value The section content
   * @returns The builder instance for chaining
   */
  addCustom(label: string, value: string): OpenAIPromptBuilderService {
    this.parts.push(`${label}: ${value}`);
    return this;
  }

  /**
   * Combines all parts into the final system prompt string
   * @returns The complete system prompt
   */
  build(): string {
    return this.parts.join('\n');
  }

  /**
   * Resets the builder to start fresh
   * @returns The builder instance for chaining
   */
  reset(): OpenAIPromptBuilderService {
    this.parts = [];
    return this;
  }
}
