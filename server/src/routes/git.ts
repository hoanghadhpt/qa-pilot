import { Router } from 'express';
import { gitService } from '../services/gitService';

const router = Router();

router.get('/status', async (_req, res) => {
  const status = await gitService.getStatus();
  res.json(status);
});

router.post('/sync', async (req, res) => {
  const author = String(req.body?.author || 'QA Pilot User');
  const result = await gitService.syncSpecs(author);
  if (!result.synced && result.status.hasConflicts) {
    res.status(409).json(result);
    return;
  }
  res.json(result);
});

router.post('/resolve', async (req, res) => {
  try {
    const projectId = String(req.body?.projectId || 'default');
    const specPath = String(req.body?.specPath || '');
    const testId = String(req.body?.testId || '');
    const resolvedSteps = Array.isArray(req.body?.resolvedSteps)
      ? req.body.resolvedSteps
      : [];

    const status = await gitService.resolveConflict(
      projectId,
      specPath,
      testId,
      resolvedSteps
    );
    res.json({ resolved: true, status });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Lỗi khi giải quyết xung đột.',
    });
  }
});

export default router;

