import {
  ConditionConfigSchema,
  DelayConfigSchema,
  EndConfigSchema,
  HttpRequestConfigSchema,
  SetVariableConfigSchema,
} from '@/lib/schemas/flow';
import type { NodeDefinition } from '../node-types';
import { formatValue, renderTemplate } from '../template';

export const conditionNode: NodeDefinition<typeof ConditionConfigSchema> = {
  type: 'condition',
  configSchema: ConditionConfigSchema,
  category: 'logic',
  label: 'Condition',
  description: 'Branch on a value collected earlier in the flow.',

  async enter(config, runtime) {
    const actual = runtime.variables[config.variable];
    const result = evaluate(actual, config.comparator, config.value);

    runtime.note({ variable: config.variable, actual: formatValue(actual), result });

    return { kind: 'advance', handle: result ? 'true' : 'false' };
  },
};

function evaluate(
  actual: unknown,
  comparator: (typeof ConditionConfigSchema)['_output']['comparator'],
  expected: string | undefined
): boolean {
  const actualText = formatValue(actual).trim().toLowerCase();
  const expectedText = (expected ?? '').trim().toLowerCase();

  switch (comparator) {
    case 'equals':
      return actualText === expectedText;
    case 'not_equals':
      return actualText !== expectedText;
    case 'contains':
      return actualText.includes(expectedText);
    case 'greater_than':
      return Number(actual) > Number(expected);
    case 'less_than':
      return Number(actual) < Number(expected);
    case 'is_set':
      return actual !== undefined && actual !== null && actualText !== '';
    case 'is_empty':
      return actual === undefined || actual === null || actualText === '';
    default:
      return false;
  }
}

export const setVariableNode: NodeDefinition<typeof SetVariableConfigSchema> = {
  type: 'set_variable',
  configSchema: SetVariableConfigSchema,
  category: 'logic',
  label: 'Set variable',
  description: 'Store or compute a value for use later in the flow.',

  async enter(config, runtime) {
    for (const { name, value } of config.assignments) {
      runtime.setVariable(name, renderTemplate(value, runtime.variables));
    }
    return { kind: 'advance' };
  },
};

const UNIT_MS = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
} as const;

export const delayNode: NodeDefinition<typeof DelayConfigSchema> = {
  type: 'delay',
  configSchema: DelayConfigSchema,
  category: 'logic',
  label: 'Wait',
  description: 'Pause the flow, then carry on. Used for nudges and reminders.',

  async enter(config) {
    const resumeAt = new Date(Date.now() + config.duration * UNIT_MS[config.unit]);
    return { kind: 'sleep', resumeAt };
  },
};

export const endNode: NodeDefinition<typeof EndConfigSchema> = {
  type: 'end',
  configSchema: EndConfigSchema,
  category: 'logic',
  label: 'End',
  description: 'Finish the flow.',

  async enter(config) {
    return { kind: 'end', reason: config.reason };
  },
};

export const httpRequestNode: NodeDefinition<typeof HttpRequestConfigSchema> = {
  type: 'http_request',
  configSchema: HttpRequestConfigSchema,
  category: 'logic',
  label: 'HTTP request',
  description: 'Call an external service and optionally save the response.',

  async enter(config, runtime) {
    const url = renderTemplate(config.url, runtime.variables);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: { 'content-type': 'application/json', ...config.headers },
        body:
          config.body && config.method !== 'GET'
            ? renderTemplate(config.body, runtime.variables)
            : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON — keep the raw body, which is still useful in a template.
      }

      if (config.saveAs) runtime.setVariable(config.saveAs, parsed);
      runtime.note({ url, status: response.status });

      return { kind: 'advance', handle: response.ok ? 'success' : 'error' };
    } catch (cause) {
      // A failed call must not strand the customer mid-conversation, so this
      // takes the error branch rather than throwing the run into 'failed'.
      runtime.note({
        url,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return { kind: 'advance', handle: 'error' };
    } finally {
      clearTimeout(timer);
    }
  },
};
