import { useState, useCallback, useRef } from 'react';
import { AiAgentInfo, CdpStatus, StepRunStatus, TestRunSummary } from '../types';

export interface LiveStepProgress {
  [stepId: string]: {
    status: StepRunStatus;
    durationMs?: number;
    error?: string;
  };
}

export function useTestRunner(onRunFinished?: (summary: TestRunSummary) => void) {
  const [isRunning, setIsRunning] = useState(false);
  const [triageMessage, setTriageMessage] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState<LiveStepProgress>({});
  const [latestSummary, setLatestSummary] = useState<TestRunSummary | null>(null);
  const [cdpStatus, setCdpStatus] = useState<CdpStatus>({
    connected: false,
    cdpUrl: 'http://127.0.0.1:9222',
    headless: false,
  });
  const [aiAgents, setAiAgents] = useState<AiAgentInfo[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string>('');

  const eventSourceRef = useRef<EventSource | null>(null);

  const refreshCdpStatus = useCallback(async () => {
    try {
      const [cdpRes, agentsRes] = await Promise.all([
        fetch('/api/runner/cdp-status'),
        fetch('/api/runner/ai-agents'),
      ]);
      if (cdpRes.ok) {
        const data = (await cdpRes.json()) as CdpStatus;
        setCdpStatus(data);
      }
      if (agentsRes.ok) {
        const agentData = (await agentsRes.json()) as {
          activeAgentId: string;
          agents: AiAgentInfo[];
        };
        if (Array.isArray(agentData.agents)) {
          setAiAgents(agentData.agents);
        }
        if (agentData.activeAgentId) {
          setActiveAgentId(agentData.activeAgentId);
        }
      }
    } catch {
      // ignore network error
    }
  }, []);

  const selectAiAgent = useCallback(async (agentId: string) => {
    try {
      const res = await fetch('/api/runner/ai-agents/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          activeAgentId: string;
          agents: AiAgentInfo[];
        };
        setAiAgents(data.agents || []);
        setActiveAgentId(data.activeAgentId || agentId);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const launchCdpBrowser = useCallback(async (headless: boolean) => {
    try {
      const res = await fetch('/api/runner/cdp-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headless }),
      });
      if (res.ok) {
        const data = (await res.json()) as CdpStatus;
        setCdpStatus(data);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const runTest = useCallback(
    (
      projectId: string,
      testId: string,
      environment: string,
      options?: { stepId?: string; headless?: boolean }
    ) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setIsRunning(true);
      setTriageMessage(null);
      if (!options?.stepId) {
        setStepProgress({});
      }

      const params = new URLSearchParams({
        projectId,
        testId,
        environment,
      });
      if (options?.stepId) {
        params.set('stepId', options.stepId);
      }
      if (typeof options?.headless === 'boolean') {
        params.set('headless', String(options.headless));
      }

      const es = new EventSource(`/api/runner/stream?${params.toString()}`);
      eventSourceRef.current = es;

      es.addEventListener('step', (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          setStepProgress((prev) => ({
            ...prev,
            [payload.stepId]: {
              status: payload.status,
              durationMs: payload.durationMs,
              error: payload.error,
            },
          }));
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener('triage', (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          setTriageMessage(payload.message || 'Đang phân tích nguyên nhân lỗi...');
        } catch {
          // ignore
        }
      });

      es.addEventListener('blocked', (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          if (payload.summary) {
            setLatestSummary(payload.summary);
            onRunFinished?.(payload.summary);
          }
        } finally {
          setIsRunning(false);
          setTriageMessage(null);
          es.close();
        }
      });

      es.addEventListener('complete', (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          if (payload.summary) {
            setLatestSummary(payload.summary);
            onRunFinished?.(payload.summary);
          }
        } finally {
          setIsRunning(false);
          setTriageMessage(null);
          refreshCdpStatus();
          es.close();
        }
      });

      es.addEventListener('error', () => {
        setIsRunning(false);
        setTriageMessage(null);
        es.close();
      });
    },
    [onRunFinished, refreshCdpStatus]
  );

  const stopRun = useCallback(async () => {
    try {
      await fetch('/api/runner/stop', { method: 'POST' });
    } finally {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsRunning(false);
      setTriageMessage(null);
    }
  }, []);

  return {
    isRunning,
    triageMessage,
    stepProgress,
    latestSummary,
    setLatestSummary,
    cdpStatus,
    aiAgents,
    activeAgentId,
    selectAiAgent,
    refreshCdpStatus,
    launchCdpBrowser,
    runTest,
    stopRun,
  };
}

