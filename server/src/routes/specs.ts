import { Router } from 'express';
import { specAdapter } from '../services/specAdapter';
import { artifactManager } from '../services/artifactManager';
import { environmentManager } from '../services/environmentManager';

const router = Router();

router.get('/', (req, res) => {
  const projectId = String(req.query.projectId || 'default');
  const envName = String(req.query.environment || 'local');

  const loaded = specAdapter.listSpecs(projectId);
  const specs = loaded.map((item) => {
    const latestRun = artifactManager.getLatestRunForTest(projectId, item.spec.id);
    const prodSafety = environmentManager.evaluateProdSafety(projectId, envName, item.spec);
    return {
      fileName: item.fileName,
      spec: item.spec,
      lastRun: latestRun
        ? {
            runId: latestRun.runId,
            status: latestRun.status,
            durationMs: latestRun.durationMs,
            startedAt: latestRun.startedAt,
          }
        : null,
      prodSafety,
    };
  });

  res.json({ projectId, specs });
});

router.put('/:testId', (req, res) => {
  try {
    const projectId = String(req.body.projectId || 'default');
    const existing = specAdapter.getSpecById(projectId, req.params.testId);
    const saved = specAdapter.saveSpec(
      projectId,
      req.body.spec,
      req.body.fileName || existing?.fileName
    );
    res.json({ saved: true, fileName: saved.fileName, spec: saved.spec });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Lỗi khi lưu kịch bản.',
    });
  }
});

router.post('/', (req, res) => {
  try {
    const projectId = String(req.body.projectId || 'default');
    const saved = specAdapter.saveSpec(projectId, req.body.spec);
    res.status(201).json({
      created: true,
      fileName: saved.fileName,
      spec: saved.spec,
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Lỗi khi tạo kịch bản mới.',
    });
  }
});

export default router;

