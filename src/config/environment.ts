import dotenv from 'dotenv';
import { resolve } from 'node:path';

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): void {
    const filename = env.NODE_ENV === 'production' ? 'OfficellServer.env' : '.env';
    dotenv.config({ path: resolve(cwd, filename), processEnv: env as Record<string, string>, quiet: true });
}
