import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const REPO_ROOT = path.resolve(__dirname, '../../..');

export const config = {
  port: Number(process.env.PORT || 4000),
  cdpUrl: process.env.CDP_URL || 'http://127.0.0.1:9222',
  cdpPort: Number(process.env.CDP_PORT || 9222),
  repoRoot: REPO_ROOT,
  testsRoot: path.join(REPO_ROOT, 'tests'),
  projectsRoot: path.join(REPO_ROOT, 'tests', 'projects'),
  runsRoot: path.join(REPO_ROOT, 'tests', 'runs'),
  tempRoot: path.join(REPO_ROOT, 'tests', 'temp'),
  chromeProfileDir: path.join(REPO_ROOT, 'tests', 'temp', 'chrome-profile'),
  promptsRoot: path.join(__dirname, '..', 'prompts'),
};
