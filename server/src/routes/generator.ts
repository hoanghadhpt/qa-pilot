import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config/env';
import { cliRunner, MultiStageExplorationResult } from '../services/cliRunner';
import { environmentManager } from '../services/environmentManager';
import { specAdapter, TestAssertion, TestSpec } from '../services/specAdapter';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(config.tempRoot, { recursive: true });
    cb(null, config.tempRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `upload-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

function synthesizeSpecsFromExploration(
  prompt: string,
  happyId: string,
  negativeId: string,
  exploration: MultiStageExplorationResult
): TestSpec[] {
  const shortTitle = prompt
    .replace(/https?:\/\/[^\s]+/g, (u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return u;
      }
    })
    .split('\n')[0]
    .trim()
    .slice(0, 75);

  const pageUrl = exploration.primaryUrl || '${env.BASE_URL}';
  const isFormIntent = /nhập|điền|form|biểu mẫu|đăng ký|đăng nhập|register|login|submit/i.test(
    prompt
  );

  let urlHostOrPath = '';
  try {
    const parsedUrl = new URL(pageUrl);
    urlHostOrPath =
      parsedUrl.pathname && parsedUrl.pathname !== '/'
        ? parsedUrl.pathname
        : parsedUrl.hostname;
  } catch {
    urlHostOrPath = '';
  }

  const finalScreen =
    exploration.traces[exploration.traces.length - 1] || exploration.traces[0] || null;

  // Use chronological steps & assertions synthesized directly by the Sequential Multi-Step Clause Engine
  let steps: TestSpec['steps'] =
    exploration.synthesizedSteps && exploration.synthesizedSteps.length > 0
      ? [...exploration.synthesizedSteps]
      : [];
  let assertions: TestAssertion[] =
    exploration.synthesizedAssertions && exploration.synthesizedAssertions.length > 0
      ? [...exploration.synthesizedAssertions]
      : [];

  if (steps.length === 0) {
    let stepCounter = 1;
    steps.push({
      id: `step-${stepCounter++}`,
      action: 'open',
      target: pageUrl,
      ...(urlHostOrPath ? { expected: urlHostOrPath } : {}),
      description: `Mở trang ${pageUrl}`,
      optional: false,
    });

    if (exploration.needsScroll) {
      const hasFooter = finalScreen?.matchedTexts.some((mt) => mt.selector === 'footer');
      steps.push({
        id: `step-${stepCounter++}`,
        action: 'scroll',
        target: 'bottom',
        ...(hasFooter ? { expected: 'footer' } : {}),
        description: 'Cuộn xuống cuối trang',
        optional: false,
      });
    }

    for (const kw of exploration.extractedKeywords) {
      steps.push({
        id: `step-${stepCounter++}`,
        action: 'assert',
        target: exploration.needsScroll ? 'footer' : 'body',
        expected: kw,
        description: `Kiểm chứng hiển thị nội dung '${kw}'`,
        optional: false,
      });
    }
  }

  if (assertions.length === 0 && urlHostOrPath) {
    assertions.push({
      type: 'url_contains',
      target: urlHostOrPath,
      severity: 'error',
    });
  }

  const specs: TestSpec[] = [
    {
      id: happyId,
      title: shortTitle || `Kiểm thử luồng ${pageUrl}`,
      description: prompt,
      tags: isFormIntent ? ['smoke'] : ['smoke', 'read-only'],
      environments: {
        allowed: ['local', 'staging', 'production'],
        blocked: [],
      },
      steps,
      assertions,
    },
  ];

  // Only add a Negative Case if the prompt is testing form submission / input validation
  if (isFormIntent && finalScreen) {
    const firstInput =
      finalScreen.elements.find((e) => e.suggestedAction === 'input')?.selector || 'input';
    const firstSubmit =
      finalScreen.elements.find((e) => e.suggestedAction === 'click')?.selector || 'button';
    specs.push({
      id: negativeId,
      title: `Kiểm tra xử lý dữ liệu không hợp lệ trên ${urlHostOrPath || 'biểu mẫu'}`,
      description: `Kiểm tra thông báo lỗi khi nhập dữ liệu sai định dạng cho: ${shortTitle}`,
      tags: ['regression', 'negative'],
      environments: {
        allowed: ['local', 'staging'],
        blocked: ['production'],
      },
      steps: [
        {
          id: 'step-1',
          action: 'open',
          target: pageUrl,
          description: `Mở trang ${pageUrl}`,
          optional: false,
        },
        {
          id: 'step-2',
          action: 'input',
          target: firstInput,
          value: 'du-lieu-khong-hop-le',
          description: 'Nhập dữ liệu sai định dạng',
          optional: false,
        },
        {
          id: 'step-3',
          action: 'click',
          target: firstSubmit,
          description: 'Bấm gửi biểu mẫu',
          optional: false,
        },
      ],
      assertions: [
        {
          type: 'url_contains',
          target: urlHostOrPath || pageUrl,
          severity: 'error',
        },
      ],
    });
  }

  return specs;
}

router.post('/explore', async (req, res) => {
  const rawUrl = String(req.body.url || '').trim();
  if (!rawUrl) {
    res.status(400).json({ error: 'Vui lòng cung cấp URL cần khám phá.' });
    return;
  }

  try {
    const exploration = await cliRunner.explorePage(rawUrl);
    res.json(exploration);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Không thể khám phá trang web qua CDP.',
    });
  }
});

router.post('/generate', upload.single('image'), async (req, res) => {
  const projectId = String(req.body.projectId || 'default');
  const envName = String(req.body.environment || 'local');
  const acceptanceCriteria = String(req.body.acceptanceCriteria || '').trim();
  const uploadedFile = req.file;

  if (!acceptanceCriteria) {
    res.status(400).json({ error: 'Vui lòng nhập yêu cầu kiểm thử (Prompt).' });
    return;
  }

  try {
    const existingSpecs = specAdapter.listSpecs(projectId);
    const nextIndex = existingSpecs.length + 1;
    const happyId = `TC-0${nextIndex}`;
    const negativeId = `TC-0${nextIndex + 1}`;

    const envs = environmentManager.listEnvironments(projectId);
    const activeEnv = envs.find((e) => e.name === envName) || envs[0];
    const defaultBaseUrl = activeEnv?.base_url || '';

    // 1. Automatically execute Multi-Screen Iterative Exploration from the single user prompt
    const exploration = await cliRunner.exploreMultiStageFlow(acceptanceCriteria, defaultBaseUrl);

    // 2. Build prompt with real multi-screen CDP context for AI CLI
    const promptPath = path.join(config.promptsRoot, 'generator.md');
    const systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : '';

    const imageNote = uploadedFile
      ? `\nĐường dẫn tệp ảnh giao diện đính kèm: ${uploadedFile.path}`
      : '';

    const exploreNote = exploration.combinedSummary
      ? `\n\nDữ liệu thực tế thu thập qua các màn hình bằng CDP:\n${exploration.combinedSummary}`
      : '';

    const fullPrompt = `${systemPrompt}\n\nMã bắt đầu: ${happyId}\nYêu cầu của người dùng:\n${acceptanceCriteria}${exploreNote}${imageNote}`;
    const cliOut = await cliRunner.invokeLocalAiCli(fullPrompt, 35000);

    let generatedSpecs: TestSpec[] | null = null;
    if (cliOut) {
      const firstBracket = cliOut.indexOf('[');
      const lastBracket = cliOut.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          const parsed = JSON.parse(cliOut.slice(firstBracket, lastBracket + 1));
          if (Array.isArray(parsed) && parsed.length > 0) {
            generatedSpecs = parsed.map((item) => specAdapter.validateSpec(item));
          }
        } catch {
          // fallback to deterministic synthesis from real exploration below
        }
      }
    }

    // 3. Deterministic synthesis directly from multi-screen CDP exploration (never dummy Register.html)
    if (!generatedSpecs) {
      generatedSpecs = synthesizeSpecsFromExploration(
        acceptanceCriteria,
        happyId,
        negativeId,
        exploration
      );
    }

    const explorationTrace = exploration.traces.map((t) => ({
      screenIndex: t.screenIndex,
      url: t.url,
      title: t.title,
      actionExecuted: t.actionExecuted,
      elementCount: t.elementCount,
      matchedTexts: t.matchedTexts,
    }));

    res.json({
      explorationTrace,
      generatedSpecs,
    });
  } finally {
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      fs.unlink(uploadedFile.path, () => {});
    }
  }
});

export default router;

