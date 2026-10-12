import type { PoolConfig } from "pg";

/** adapter-pg serializes DateTime without an offset and expects UTC result text. */
export function postgresUtcConfig(config: PoolConfig): PoolConfig {
  let options = config.options ?? process.env.PGOPTIONS ?? "";
  let connectionString = config.connectionString;
  if (connectionString) {
    const url = new URL(connectionString);
    // pg lets URL options override PoolConfig.options. Preserve other options,
    // but append UTC last in the actual startup string on every new connection.
    options = url.searchParams.get("options") ?? options;
    options = `${options} -c timezone=UTC`.trim();
    url.searchParams.set("options", options);
    connectionString = url.toString();
  } else options = `${options} -c timezone=UTC`.trim();
  return { ...config, connectionString, options };
}
