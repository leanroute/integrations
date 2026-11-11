/**
 * Headline models exposed in the picker.
 *
 * Keeping this list short (5 entries) so the picker doesn't overwhelm
 * a first-time user. Full model list is 50+ SKUs on the gateway; call
 * GET /v1/models against your key to see the full set your account can
 * reach, or import a dynamic list at runtime if you want the picker to
 * grow automatically as new models ship.
 *
 * Default is DeepSeek V4 Flash: cheap, fast, flagship-tier quality.
 * The blog post that got you here breaks down the cost math.
 */

export interface ModelOption {
  id: string;
  label: string;
  /** Short blurb shown under the label in the picker. */
  hint: string;
  /** USD per 1M tokens: input / output. Used for the cost preview. */
  inputPer1M: number;
  outputPer1M: number;
}

export const MODELS: ModelOption[] = [
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    hint: "cheap flagship, off-peak $0.22/$0.66 per M",
    inputPer1M: 0.22,
    outputPer1M: 0.66,
  },
  {
    id: "groq/openai/gpt-oss-120b",
    label: "Groq gpt-oss-120b",
    hint: "LPU-fast, $0.15/$0.60 per M",
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    hint: "Anthropic flagship, $2.00/$10.00 per M",
    inputPer1M: 2.0,
    outputPer1M: 10.0,
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    hint: "OpenAI mid-tier, $0.25/$2.00 per M",
    inputPer1M: 0.25,
    outputPer1M: 2.0,
  },
  {
    id: "google/gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    hint: "Google flagship, intro $0.75/$3.75 per M",
    inputPer1M: 0.75,
    outputPer1M: 3.75,
  },
];

export const DEFAULT_MODEL = MODELS[0]!.id;
