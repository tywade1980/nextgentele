/**
 * Centauri Interlock adapter for Manus API v2 in TypeScript/Node systems.
 *
 * This module is deliberately side-effect free until `runManusApiNode` is
 * invoked. It reads Caroline state before making any Manus API request and
 * returns a closed-loop broadcast object that can be posted to the local
 * Command_Router/event bus.
 */
import fs from 'node:fs';
import path from 'node:path';

export type InterlockBroadcast = {
  node_id: string;
  timestamp: string;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL_SUCCESS';
  payload: Record<string, unknown>;
  error: string | null;
};

export type ManusApiCommand = {
  action?: 'health' | 'create_task' | 'list_messages';
  prompt?: string;
  message?: string;
  title?: string;
  task_id?: string;
  project_id?: string;
  connectors?: string[];
  file_ids?: string[];
  limit?: number;
  order?: 'asc' | 'desc';
};

const NODE_ID = 'manus_api_node';
const MANUS_API_BASE_URL = process.env.MANUS_API_BASE_URL ?? 'https://api.manus.ai';

export function readCarolineState(stateFile = process.env.CAROLINE_STATE_FILE ?? path.resolve(process.cwd(), 'caroline_neuro_memory.json')): Record<string, any> {
  if (!fs.existsSync(stateFile)) {
    return {
      _schema_version: '2.0.0',
      system: { status: 'initialized' },
      neurorank: { composite_score: 0, regions: {} },
      context: {},
      integrations: {},
      history: [],
    };
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

export function buildBroadcast(status: InterlockBroadcast['status'], payload: Record<string, unknown> = {}, error: string | null = null): InterlockBroadcast {
  return {
    node_id: NODE_ID,
    timestamp: new Date().toISOString(),
    status,
    payload,
    error,
  };
}

async function manusRequest(endpoint: string, init: RequestInit = {}): Promise<any> {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) {
    throw new Error('MANUS_API_KEY is not set; refusing to make a live Manus API call.');
  }
  const response = await fetch(`${MANUS_API_BASE_URL.replace(/\/$/, '')}/v2/${endpoint.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-manus-api-key': apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok || parsed.ok === false) {
    throw new Error(`Manus API ${response.status}: ${text}`);
  }
  return parsed;
}

export async function runManusApiNode(command: ManusApiCommand = {}): Promise<InterlockBroadcast> {
  try {
    const state = readCarolineState();
    const action = command.action ?? 'health';
    const neurorankPriority = state?.neurorank?.composite_score ?? 0;
    if (action === 'health') {
      return buildBroadcast('SUCCESS', {
        integration: 'manus_api',
        status: 'ready',
        has_api_key: Boolean(process.env.MANUS_API_KEY),
        neurorank_priority: neurorankPriority,
      });
    }
    if (action === 'create_task') {
      const prompt = command.prompt ?? command.message ?? state?.context?.active_query;
      if (!prompt) throw new Error('create_task requires prompt/message or state.context.active_query.');
      const content: Array<Record<string, string>> = [{ type: 'text', text: prompt }];
      for (const fileId of command.file_ids ?? []) content.push({ type: 'file', file_id: fileId });
      const body: Record<string, any> = {
        message: { content },
        title: command.title ?? 'Centauri OS Manus Task',
      };
      const connectors = command.connectors ?? state?.integrations?.manus?.connectors;
      if (connectors?.length) body.message.connectors = connectors;
      const projectId = command.project_id ?? state?.integrations?.manus?.project_id;
      if (projectId) body.project_id = projectId;
      const response = await manusRequest('task.create', { method: 'POST', body: JSON.stringify(body) });
      return buildBroadcast('SUCCESS', { integration: 'manus_api', action, neurorank_priority: neurorankPriority, request: body, response });
    }
    if (action === 'list_messages') {
      if (!command.task_id) throw new Error('list_messages requires task_id.');
      const limit = command.limit ?? 50;
      const order = command.order ?? 'asc';
      const response = await manusRequest(`task.listMessages?task_id=${command.task_id}&limit=${limit}&order=${order}`, { method: 'GET' });
      return buildBroadcast('SUCCESS', { integration: 'manus_api', action, neurorank_priority: neurorankPriority, response });
    }
    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    return buildBroadcast('ERROR', {}, error instanceof Error ? error.message : String(error));
  }
}
