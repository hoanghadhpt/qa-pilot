import { Router } from 'express';
import { cliRunner } from '../services/cliRunner';
import { specAdapter } from '../services/specAdapter';
import { artifactManager } from '../services/artifactManager';

const router = Router();

router.get('/cdp-status', async (_req, res) => {
  const status = await cliRunner.getCdpStatus();
  res.json(status);
});

router.post('/cdp-launch', async (req, res) => {
  try {
    const headless = Boolean(req.body?.headless);
    const status = await cliRunner.ensureCdpBrowser(headless);
    res.json(status);
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err instanceof Error ? err.message : 'Không thể khởi động trình duyệt CDP.',
    });
  }
});

router.post('/stop', (_req, res) => {
  cliRunner.stopActiveRun();
  res.json({ stopped: true });
});

router.get('/stream', async (req, res) => {
  const projectId = String(req.query.projectId || 'default');
  const testId = String(req.query.testId || '');
  const envName = String(req.query.environment || 'local');
  const stepId = req.query.stepId ? String(req.query.stepId) : undefined;
  const headless =
    req.query.headless !== undefined ? req.query.headless === 'true' : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const loaded = specAdapter.getSpecById(projectId, testId);
  if (!loaded) {
    sendEvent('error', { message: `Không tìm thấy kịch bản '${testId}'.` });
    res.end();
    return;
  }

  try {
    await cliRunner.executeSpec(projectId, envName, loaded.spec, sendEvent, {
      stepId,
      headless,
    });
  } catch (err) {
    sendEvent('error', {
      message: err instanceof Error ? err.message : 'Lỗi khi thực thi kịch bản.',
    });
  } finally {
    res.end();
  }
});

router.get('/runs/:runId', (req, res) => {
  const summary = artifactManager.readSummary(req.params.runId);
  if (!summary) {
    res.status(404).json({ error: 'Không tìm thấy kết quả lần chạy.' });
    return;
  }
  res.json(summary);
});

router.get('/artifacts/:runId/:fileName', (req, res) => {
  const filePath = artifactManager.getArtifactPath(req.params.runId, req.params.fileName);
  if (!filePath) {
    res.status(404).json({ error: 'Không tìm thấy tệp bằng chứng.' });
    return;
  }
  res.sendFile(filePath);
});

export default router;

