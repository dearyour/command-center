import { GATED, connected as gatedConnected } from '@/lib/connectors/demo-status';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ConnectorStatus } from '@/lib/connectors/types';

const VAULT = process.env.OBSIDIAN_VAULT ?? '';
const WALK_CAP = 5000;

function countMarkdown(dir: string, state = { files: 0, visited: 0 }): number {
  if (state.visited > WALK_CAP) return state.files;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return state.files;
  }
  for (const entry of entries) {
    state.visited++;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) countMarkdown(full, state);
    else if (entry.name.endsWith('.md')) state.files++;
  }
  return state.files;
}

// One conversation export can run to megabytes; the memory graph only needs
// enough text for an excerpt + a lexical embedding.
const NOTE_CONTENT_CAP = 20_000;

/**
 * Read the vault's markdown notes as BrainNote-shaped
 * `{ path, content }` rows for the /brain memory constellation. Vault-relative
 * paths, dot-dirs skipped, content capped, never throws — a missing vault or a
 * macOS TCC denial yields `[]` so callers can fall back gracefully.
 */
export function readVaultNotes(vaultPath: string = VAULT): { path: string; content: string }[] {
  const notes: { path: string; content: string }[] = [];
  const state = { visited: 0 };
  const walk = (dir: string) => {
    if (state.visited > WALK_CAP) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      state.visited++;
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) {
        try {
          notes.push({
            path: path.relative(vaultPath, full).split(path.sep).join('/'),
            content: fs.readFileSync(full, 'utf8').slice(0, NOTE_CONTENT_CAP),
          });
        } catch {
          // unreadable file — skip it
        }
      }
    }
  };
  walk(vaultPath);
  return notes.sort((a, b) => a.path.localeCompare(b.path));
}

export async function obsidianStatus(): Promise<ConnectorStatus> {
  if (GATED) return gatedConnected('obsidian', 'Obsidian', 'knowledge', '800+ notes indexed');
  if (!fs.existsSync(VAULT)) {
    return {
      id: 'obsidian',
      name: 'Obsidian 보관소',
      kind: 'knowledge',
      state: 'not_configured',
      detail: `${VAULT}에서 보관소를 찾을 수 없습니다 — OBSIDIAN_VAULT로 경로를 지정하세요.`,
    };
  }
  try {
    // Documents/ is TCC-protected: reading throws EPERM unless the process
    // (Terminal/launchd job) has Files & Folders access — surface that honestly.
    fs.readdirSync(VAULT);
  } catch {
    return {
      id: 'obsidian',
      name: 'Obsidian 보관소',
      kind: 'knowledge',
      state: 'error',
      detail:
        '보관소는 있지만 macOS가 접근을 거부했습니다 — 시스템 설정 → 개인정보 보호에서 터미널에 "파일 및 폴더 → 문서" 권한을 주세요.',
    };
  }
  const notes = countMarkdown(VAULT);
  return {
    id: 'obsidian',
    name: 'Obsidian 보관소',
    kind: 'knowledge',
    state: 'connected',
    detail: `${VAULT.replace(os.homedir(), '~')}의 마크다운 메모 ${notes.toLocaleString('en-US')}개`,
    meta: { notes },
  };
}
