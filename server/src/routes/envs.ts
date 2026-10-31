import { Router } from 'express';
import { environmentManager } from '../services/environmentManager';

const router = Router();

router.get('/', (req, res) => {
  const projectId = String(req.query.projectId || 'default');
  const environments = environmentManager.listEnvironments(projectId);
  const availableHelpers = environmentManager.getAvailableHelperTokens(projectId);

  res.json({
    projectId,
    environments,
    availableHelpers,
  });
});

export default router;

