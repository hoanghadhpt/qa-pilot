import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config/env';
import { cliRunner } from '../services/cliRunner';
import { specAdapter, TestSpec } from '../services/specAdapter';

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
  const acceptanceCriteria = String(req.body.acceptanceCriteria || '').trim();
  const targetUrl = String(req.body.targetUrl || '').trim();
  const discoveredSummary = String(req.body.discoveredSummary || '').trim();
  const uploadedFile = req.file;

  if (!acceptanceCriteria && !targetUrl) {
    res.status(400).json({ error: 'Vui lòng nhập tiêu chí nghiệm thu hoặc URL trang web.' });
    return;
  }

  try {
    const existingSpecs = specAdapter.listSpecs(projectId);
    const nextIndex = existingSpecs.length + 1;
    const happyId = `TC-0${nextIndex}`;
    const negativeId = `TC-0${nextIndex + 1}`;

    const promptPath = path.join(config.promptsRoot, 'generator.md');
    const systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : '';

    const imageNote = uploadedFile
      ? `\nĐường dẫn tệp ảnh giao diện đính kèm: ${uploadedFile.path}`
      : '';

    const urlNote = targetUrl ? `\nURL trang web đích: ${targetUrl}` : '';
    const exploreNote = discoveredSummary
      ? `\n\nCấu trúc các phần tử thực tế và cây ngữ nghĩa khám phá từ trang web:\n${discoveredSummary}`
      : '';

    const fullPrompt = `${systemPrompt}\n\nMã bắt đầu: ${happyId}${urlNote}\nTiêu chí nghiệm thu:\n${acceptanceCriteria}${exploreNote}${imageNote}`;
    const cliOut = await cliRunner.invokeLocalAiCli(fullPrompt, 14000);

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
          // fallback below
        }
      }
    }

    if (!generatedSpecs) {
      const shortTitle = (acceptanceCriteria || targetUrl).split('\n')[0].slice(0, 60);
      const pageUrl = targetUrl || '${env.BASE_URL}/Register.html';

      // Parse discovered summary to extract real selectors if available
      const discoveredSelectors: Array<{ selector: string; label: string; action: 'input' | 'click' }> = [];
      if (discoveredSummary) {
        const lines = discoveredSummary.split('\n');
        for (const line of lines) {
          const match = line.match(/\*\s+\[(input|click)\]\s+([^\s(]+)(?:\s+\((.*?)\))?/);
          if (match) {
            discoveredSelectors.push({
              action: match[1] as 'input' | 'click',
              selector: match[2],
              label: match[3] || match[2],
            });
          }
        }
      }

      // Generate realistic steps based on discovered elements
      const happySteps: TestSpec['steps'] = [
        {
          id: 'step-1',
          action: 'open',
          target: pageUrl,
          expected: pageUrl.includes('/') ? pageUrl.split('/').pop() || '' : '',
          description: `Mở trang ${pageUrl}`,
          optional: false,
        },
      ];

      if (discoveredSelectors.length > 0) {
        let stepIdx = 2;
        for (const el of discoveredSelectors.slice(0, 5)) {
          if (el.action === 'input') {
            happySteps.push({
              id: `step-${stepIdx++}`,
              action: 'input',
              target: el.selector,
              value: '${fixture.users.standard.username}',
              description: `Nhập giá trị cho ${el.label}`,
              optional: false,
            });
          } else if (el.action === 'click') {
            happySteps.push({
              id: `step-${stepIdx++}`,
              action: 'click',
              target: el.selector,
              description: `Bấm chọn ${el.label}`,
              optional: false,
            });
          }
        }
      } else {
        happySteps.push(
          {
            id: 'step-2',
            action: 'input',
            target: '#userName',
            value: '${fixture.users.standard.username}',
            description: 'Nhập họ tên hợp lệ',
            optional: false,
          },
          {
            id: 'step-3',
            action: 'input',
            target: '#userEmail',
            value: '${fixture.users.standard.email}',
            description: 'Nhập địa chỉ email hợp lệ',
            optional: false,
          },
          {
            id: 'step-4',
            action: 'click',
            target: '#submit',
            description: 'Bấm nút gửi biểu mẫu',
            optional: false,
          }
        );
      }

      const primaryAssertionTarget =
        discoveredSelectors.find((s) => s.action === 'click')?.selector ||
        (discoveredSelectors[0]?.selector ?? '#basicBootstrapForm');

      generatedSpecs = [
        {
          id: happyId,
          title: `Luồng hợp lệ: ${shortTitle}`,
          description: acceptanceCriteria || `Kịch bản kiểm thử luồng hợp lệ cho ${pageUrl}`,
          tags: ['smoke', 'read-only'],
          environments: {
            allowed: ['local', 'staging', 'production'],
            blocked: [],
          },
          steps: happySteps,
          assertions: [
            {
              type: 'element_visible',
              target: primaryAssertionTarget,
              severity: 'error',
            },
          ],
        },
        {
          id: negativeId,
          title: `Luồng ngoại lệ: Kiểm tra xử lý lỗi biểu mẫu`,
          description: `Kiểm tra xử lý lỗi cho yêu cầu: ${shortTitle}`,
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
              target: discoveredSelectors.find((s) => s.action === 'input')?.selector || '#userEmail',
              value: 'du-lieu-sai-dinh-dang',
              description: 'Nhập dữ liệu không hợp lệ để kiểm tra thông báo lỗi',
              optional: false,
            },
            {
              id: 'step-3',
              action: 'click',
              target: discoveredSelectors.find((s) => s.action === 'click')?.selector || '#submit',
              description: 'Bấm nút gửi biểu mẫu',
              optional: false,
            },
          ],
          assertions: [
            {
              type: 'element_visible',
              target: primaryAssertionTarget,
              severity: 'error',
            },
          ],
        },
      ];
    }

    res.json({ generatedSpecs });
  } finally {
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      fs.unlink(uploadedFile.path, () => {});
    }
  }
});

export default router;

