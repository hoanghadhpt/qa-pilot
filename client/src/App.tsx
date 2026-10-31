import React, { useEffect, useState, useCallback } from 'react';
import { ConfigProvider, message } from 'antd';
import {
  EnvironmentConfig,
  GitStatus,
  SpecConflict,
  SpecListItem,
  TestRunSummary,
  TestSpec,
} from './types';
import { Header } from './components/Header';
import { SuiteSidebar } from './components/SuiteSidebar';
import { StepEditor } from './components/StepEditor';
import { EvidenceViewer } from './components/EvidenceViewer';
import { GenerateSpecModal } from './components/GenerateSpecModal';
import { ConflictModal } from './components/ConflictModal';
import { useTestRunner } from './hooks/useTestRunner';

export const App: React.FC = () => {
  const [projectId, setProjectId] = useState('default');
  const [environment, setEnvironment] = useState('local');
  const [environments, setEnvironments] = useState<EnvironmentConfig[]>([
    { name: 'local', is_production: false, base_url: 'https://demo.automationtesting.in', allowed_domains: ['demo.automationtesting.in'] },
    { name: 'staging', is_production: false, base_url: 'https://demo.automationtesting.in', allowed_domains: ['demo.automationtesting.in'] },
    { name: 'production', is_production: true, base_url: 'https://demo.automationtesting.in', allowed_domains: ['demo.automationtesting.in'] },
  ]);
  const [availableHelpers, setAvailableHelpers] = useState<string[]>([]);
  const [specs, setSpecs] = useState<SpecListItem[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [activeSpec, setActiveSpec] = useState<TestSpec | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const [gitStatus, setGitStatus] = useState<GitStatus>({
    branch: 'main',
    ahead: 0,
    behind: 0,
    modified: [],
    hasConflicts: false,
  });
  const [isSyncingGit, setIsSyncingGit] = useState(false);
  const [activeConflict, setActiveConflict] = useState<SpecConflict | null>(null);

  const fetchSpecs = useCallback(
    async (keepSelectedId?: string) => {
      try {
        const res = await fetch(
          `/api/specs?projectId=${encodeURIComponent(projectId)}&environment=${encodeURIComponent(
            environment
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const loadedSpecs: SpecListItem[] = data.specs || [];
        setSpecs(loadedSpecs);

        const targetId = keepSelectedId || activeSpec?.id;
        const matched = loadedSpecs.find((s) => s.spec.id === targetId) || loadedSpecs[0];
        if (matched) {
          setSelectedFileName(matched.fileName);
          setActiveSpec(matched.spec);
        }
      } catch {
        // ignore fetch error
      }
    },
    [projectId, environment, activeSpec?.id]
  );

  const fetchEnvsAndGit = useCallback(async () => {
    try {
      const [envRes, gitRes] = await Promise.all([
        fetch(`/api/envs?projectId=${encodeURIComponent(projectId)}`),
        fetch('/api/git/status'),
      ]);
      if (envRes.ok) {
        const envData = await envRes.json();
        if (Array.isArray(envData.environments)) {
          setEnvironments(envData.environments);
        }
        if (Array.isArray(envData.availableHelpers)) {
          setAvailableHelpers(envData.availableHelpers);
        }
      }
      if (gitRes.ok) {
        const gitData = (await gitRes.json()) as GitStatus;
        setGitStatus(gitData);
        if (gitData.hasConflicts && gitData.conflicts && gitData.conflicts.length > 0) {
          setActiveConflict(gitData.conflicts[0]);
        }
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  const handleRunFinished = useCallback(
    (_summary: TestRunSummary) => {
      fetchSpecs(activeSpec?.id);
    },
    [fetchSpecs, activeSpec?.id]
  );

  const {
    isRunning,
    triageMessage,
    stepProgress,
    latestSummary,
    setLatestSummary,
    cdpStatus,
    refreshCdpStatus,
    launchCdpBrowser,
    runTest,
    stopRun,
  } = useTestRunner(handleRunFinished);

  useEffect(() => {
    fetchSpecs();
    fetchEnvsAndGit();
    refreshCdpStatus();
  }, [projectId, environment]);

  const handleSelectSpec = async (item: SpecListItem) => {
    setSelectedFileName(item.fileName);
    setActiveSpec(item.spec);
    if (item.lastRun?.runId) {
      try {
        const res = await fetch(`/api/runner/runs/${item.lastRun.runId}`);
        if (res.ok) {
          const runData = (await res.json()) as TestRunSummary;
          setLatestSummary(runData);
          return;
        }
      } catch {
        // ignore
      }
    }
    setLatestSummary(null);
  };

  const handleSaveSpec = async () => {
    if (!activeSpec) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/specs/${encodeURIComponent(activeSpec.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          fileName: selectedFileName,
          spec: activeSpec,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi khi lưu kịch bản.');
      }
      message.success('Đã lưu kịch bản.');
      await fetchSpecs(activeSpec.id);
      await fetchEnvsAndGit();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể lưu kịch bản.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncGit = async () => {
    setIsSyncingGit(true);
    try {
      const res = await fetch('/api/git/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'QA Pilot User' }),
      });
      const data = await res.json();
      if (res.status === 409 && data.status?.conflicts?.length > 0) {
        setGitStatus(data.status);
        setActiveConflict(data.status.conflicts[0]);
        message.warning('Phát hiện xung đột kịch bản cần giải quyết.');
        return;
      }
      if (data.status) {
        setGitStatus(data.status);
      }
      message.success(data.message || 'Đã đồng bộ kịch bản.');
    } catch {
      message.error('Lỗi khi đồng bộ Git.');
    } finally {
      setIsSyncingGit(false);
    }
  };

  const handleApplySuggestedSelector = async (
    failedStepIndex: number,
    suggestedSelector: string
  ) => {
    if (!activeSpec) return;
    const idx = failedStepIndex - 1;
    if (idx < 0 || idx >= activeSpec.steps.length) return;

    const updatedSteps = activeSpec.steps.map((s, i) =>
      i === idx ? { ...s, target: suggestedSelector } : s
    );
    const updatedSpec: TestSpec = { ...activeSpec, steps: updatedSteps };
    setActiveSpec(updatedSpec);

    try {
      await fetch(`/api/specs/${encodeURIComponent(updatedSpec.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          fileName: selectedFileName,
          spec: updatedSpec,
        }),
      });
      message.success(`Đã cập nhật bộ chọn bước #${failedStepIndex} thành '${suggestedSelector}'.`);
      await fetchSpecs(updatedSpec.id);
    } catch {
      message.error('Không thể lưu bộ chọn gợi ý.');
    }
  };

  const currentSpecItem = specs.find((s) => s.spec.id === activeSpec?.id);
  const prodSafety = currentSpecItem?.prodSafety || { allowed: true, reason: null };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 4,
          fontSize: 13,
        },
      }}
    >
      <div className="app-shell">
        <Header
          projectId={projectId}
          onProjectChange={setProjectId}
          environment={environment}
          environments={environments}
          onEnvironmentChange={setEnvironment}
          gitStatus={gitStatus}
          isSyncingGit={isSyncingGit}
          onSyncGit={handleSyncGit}
          cdpStatus={cdpStatus}
          onLaunchCdp={(headless) => launchCdpBrowser(headless)}
        />

        <div className="workspace-grid">
          <SuiteSidebar
            specs={specs}
            selectedTestId={activeSpec?.id || null}
            onSelectSpec={handleSelectSpec}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
          />

          <StepEditor
            spec={activeSpec}
            prodSafety={prodSafety}
            availableHelpers={availableHelpers}
            isRunning={isRunning}
            isSaving={isSaving}
            stepProgress={stepProgress}
            onChangeSpec={setActiveSpec}
            onSaveSpec={handleSaveSpec}
            onRunFullSpec={() => {
              if (activeSpec) {
                runTest(projectId, activeSpec.id, environment, {
                  headless: cdpStatus.headless,
                });
              }
            }}
            onRunSingleStep={(stepId) => {
              if (activeSpec) {
                runTest(projectId, activeSpec.id, environment, {
                  stepId,
                  headless: cdpStatus.headless,
                });
              }
            }}
            onStopRun={stopRun}
          />

          <EvidenceViewer
            summary={latestSummary}
            triageMessage={triageMessage}
            onApplySuggestedSelector={handleApplySuggestedSelector}
          />
        </div>

        <GenerateSpecModal
          open={isGeneratorOpen}
          projectId={projectId}
          onClose={() => setIsGeneratorOpen(false)}
          onSavedSpecs={() => {
            fetchSpecs();
            fetchEnvsAndGit();
          }}
        />

        <ConflictModal
          open={Boolean(activeConflict)}
          projectId={projectId}
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolved={() => {
            fetchSpecs();
            fetchEnvsAndGit();
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default App;

