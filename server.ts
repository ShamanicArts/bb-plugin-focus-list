import {
  cliCommand,
  defineCli,
  defineRpcContract,
  PluginCliError,
  type BbPluginApi,
} from "@get-bb/plugin-sdk";
import { z } from "zod";
import {
  defaultPreferences,
  describePreference,
  getPreferenceDefault,
  isPreferenceKey,
  parsePreferenceValue,
  PREFERENCE_KEYS,
  PREFERENCES_CHANGED_CHANNEL,
  preferenceDefinitions,
  type PreferenceKey,
  type PreferenceValue,
  type PreferenceValues,
} from "./shared/preferences.js";

const PREFERENCE_KV_PREFIX = "preference:";
const MIGRATION_KV_KEY = "migration:ui-preferences:v1";
const IMPORT_KV_PREFIX = "import:preferences:";

const preferenceKeySchema = z.enum(
  PREFERENCE_KEYS as [PreferenceKey, ...PreferenceKey[]],
);

const preferenceValuesSchema = z.object(
  Object.fromEntries(
    PREFERENCE_KEYS.map((key) => [key, preferenceDefinitions[key].schema]),
  ) as { [Key in PreferenceKey]: (typeof preferenceDefinitions)[Key]["schema"] },
);

export const threadListRpcContract = defineRpcContract({
  listPreferences: {
    input: z.null(),
    output: z.object({ preferences: preferenceValuesSchema }).strict(),
  },
  setPreference: {
    input: z.object({ key: preferenceKeySchema, value: z.unknown() }).strict(),
    output: z
      .object({ key: preferenceKeySchema, value: z.unknown() })
      .strict(),
  },
  importPreferences: {
    input: z
      .object({
        source: z.string().min(1).max(100),
        values: z.record(z.string().max(100), z.unknown()),
      })
      .strict(),
    output: z.object({ imported: z.array(preferenceKeySchema) }).strict(),
  },
  resetPreference: {
    input: z.object({ key: preferenceKeySchema }).strict(),
    output: z
      .object({ key: preferenceKeySchema, value: z.unknown() })
      .strict(),
  },
});

function kvKey(key: PreferenceKey): string {
  return `${PREFERENCE_KV_PREFIX}${key}`;
}

export function createPreferenceStore(bb: BbPluginApi) {
  async function read<Key extends PreferenceKey>(
    key: Key,
  ): Promise<PreferenceValue<Key>> {
    const stored = await bb.storage.kv.get<unknown>(kvKey(key));
    if (stored === undefined) return getPreferenceDefault(key);
    const parsed = parsePreferenceValue(key, stored);
    if (parsed.success) return parsed.value;
    bb.log.warn(
      `stored preference ${key} is invalid (${parsed.message}); using the default`,
    );
    return getPreferenceDefault(key);
  }

  async function readAll(): Promise<PreferenceValues> {
    const values = defaultPreferences();
    await Promise.all(
      PREFERENCE_KEYS.map(async (key) => {
        (values as Record<PreferenceKey, unknown>)[key] = await read(key);
      }),
    );
    return values;
  }

  async function write<Key extends PreferenceKey>(
    key: Key,
    value: unknown,
  ): Promise<PreferenceValue<Key>> {
    const parsed = parsePreferenceValue(key, value);
    if (!parsed.success) {
      throw new PreferenceValidationError(key, parsed.message);
    }
    await bb.storage.kv.set(kvKey(key), parsed.value);
    bb.realtime.publish(PREFERENCES_CHANGED_CHANNEL, {
      key,
      value: parsed.value,
    });
    return parsed.value;
  }

  async function reset<Key extends PreferenceKey>(
    key: Key,
  ): Promise<PreferenceValue<Key>> {
    await bb.storage.kv.delete(kvKey(key));
    const value = getPreferenceDefault(key);
    bb.realtime.publish(PREFERENCES_CHANGED_CHANNEL, { key, value });
    return value;
  }

  /**
   * One-time import of another list's layout (BB's bundled thread list), so
   * switching keeps project order, collapsed groups and organization. Runs once
   * per source; later calls are no-ops.
   */
  async function importOnce(
    source: string,
    values: Record<string, unknown>,
  ): Promise<PreferenceKey[]> {
    const flag = `${IMPORT_KV_PREFIX}${source}`;
    if ((await bb.storage.kv.get<boolean>(flag)) === true) return [];
    const imported: PreferenceKey[] = [];
    for (const key of PREFERENCE_KEYS) {
      if (!(key in values)) continue;
      const parsed = parsePreferenceValue(key, values[key]);
      if (!parsed.success) continue;
      await write(key, parsed.value);
      imported.push(key);
    }
    await bb.storage.kv.set(flag, true);
    if (imported.length > 0) bb.log.info(`imported ${imported.length} layout preferences from ${source}`);
    return imported;
  }

  return { read, readAll, write, reset, importOnce };
}

export class PreferenceValidationError extends Error {
  constructor(
    readonly key: PreferenceKey,
    readonly detail: string,
  ) {
    super(`Invalid value for ${key}: ${detail}`);
    this.name = "PreferenceValidationError";
  }
}

export async function migrateFromUiPreferences(
  bb: BbPluginApi,
): Promise<{ migrated: PreferenceKey[] }> {
  const done = await bb.storage.kv.get<boolean>(MIGRATION_KV_KEY);
  if (done === true) return { migrated: [] };
  const migrated: PreferenceKey[] = [];
  let entries: Record<string, { value: unknown } | undefined>;
  try {
    const response = await bb.sdk.system.uiPreferences.list();
    entries = response.preferences as Record<
      string,
      { value: unknown } | undefined
    >;
  } catch (error) {
    bb.log.warn(
      `could not read bb's sidebar preferences to migrate them: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { migrated };
  }
  for (const key of PREFERENCE_KEYS) {
    const existing = await bb.storage.kv.get<unknown>(kvKey(key));
    if (existing !== undefined) continue;
    const legacyKey = preferenceDefinitions[key].legacyKey;
    if (legacyKey === null) continue;
    const legacy = entries[legacyKey];
    if (legacy === undefined) continue;
    const parsed = parsePreferenceValue(key, legacy.value);
    if (!parsed.success) continue;
    if (JSON.stringify(parsed.value) === JSON.stringify(getPreferenceDefault(key))) {
      continue;
    }
    await bb.storage.kv.set(kvKey(key), parsed.value);
    migrated.push(key);
  }
  await bb.storage.kv.set(MIGRATION_KV_KEY, true);
  return { migrated };
}

function parseCliValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function requireCliPreferenceKey(raw: string): PreferenceKey {
  if (isPreferenceKey(raw)) return raw;
  throw new PluginCliError(`Unknown preference: ${raw}`, {
    code: "unknown_preference",
    hint: `Known preferences: ${PREFERENCE_KEYS.join(", ")}.`,
  });
}

const JSON_OPTION = {
  type: "boolean",
  description: "Emit machine-readable JSON",
} as const;

export default async function threadListPlugin(bb: BbPluginApi) {
  const store = createPreferenceStore(bb);

  bb.rpc.register(threadListRpcContract, {
    async listPreferences() {
      return { preferences: await store.readAll() };
    },
    async setPreference({ key, value }) {
      return { key, value: await store.write(key, value) };
    },
    async importPreferences({ source, values }) {
      return { imported: await store.importOnce(source, values) };
    },
    async resetPreference({ key }) {
      return { key, value: await store.reset(key) };
    },
  });

  bb.cli.register(
    defineCli({
      name: bb.pluginId,
      summary: "Inspect and change the sidebar thread list's layout preferences",
      description:
        "Organization mode, sort, section order, hidden groups, and collapsed groups for bb's sidebar thread list. Values are JSON; a bare word is read as a string.",
      commands: {
        "prefs list": cliCommand({
          summary: "List every preference and its current value",
          options: { json: JSON_OPTION },
          async run(input) {
            const values = await store.readAll();
            if (input.options.json) {
              return { exitCode: 0, stdout: JSON.stringify(values) };
            }
            return {
              exitCode: 0,
              stdout: PREFERENCE_KEYS.map(
                (key) =>
                  `${key}\t${JSON.stringify(values[key])}\t${describePreference(key)}`,
              ).join("\n"),
            };
          },
        }),
        "prefs get": cliCommand({
          summary: "Print one preference",
          positionals: [
            { name: "key", description: "Preference name", required: true },
          ],
          options: { json: JSON_OPTION },
          async run(input) {
            const key = requireCliPreferenceKey(input.positionals.key);
            const value = await store.read(key);
            return {
              exitCode: 0,
              stdout: input.options.json
                ? JSON.stringify({ key, value })
                : JSON.stringify(value),
            };
          },
        }),
        "prefs set": cliCommand({
          summary: "Set one preference",
          positionals: [
            { name: "key", description: "Preference name", required: true },
            {
              name: "value",
              description: 'JSON value, e.g. \'"machine"\' or \'["pinned","threads"]\'',
              required: true,
            },
          ],
          options: { json: JSON_OPTION },
          async run(input) {
            const key = requireCliPreferenceKey(input.positionals.key);
            try {
              const value = await store.write(
                key,
                parseCliValue(input.positionals.value),
              );
              return {
                exitCode: 0,
                stdout: input.options.json
                  ? JSON.stringify({ key, value })
                  : `${key} = ${JSON.stringify(value)}`,
              };
            } catch (error) {
              if (error instanceof PreferenceValidationError) {
                throw new PluginCliError(error.message, {
                  code: "invalid_preference_value",
                  hint: describePreference(key),
                });
              }
              throw error;
            }
          },
        }),
        "prefs reset": cliCommand({
          summary: "Restore one preference to its default",
          positionals: [
            { name: "key", description: "Preference name", required: true },
          ],
          options: { json: JSON_OPTION },
          async run(input) {
            const key = requireCliPreferenceKey(input.positionals.key);
            const value = await store.reset(key);
            return {
              exitCode: 0,
              stdout: input.options.json
                ? JSON.stringify({ key, value })
                : `${key} = ${JSON.stringify(value)}`,
            };
          },
        }),
      },
    }),
  );

  const { migrated } = await migrateFromUiPreferences(bb);
  if (migrated.length > 0) {
    bb.log.info(
      `migrated sidebar preferences from bb settings: ${migrated.join(", ")}`,
    );
  }
}
