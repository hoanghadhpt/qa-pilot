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

router.post('/generate', upload.single('image'), async (req, res) => {
  const projectId = String(req.body.projectId || 'default');
  const acceptanceCriteria = String(req.body.acceptanceCriteria || '').trim();
  const uploadedFile = req.file;

  if (!acceptanceCriteria) {
    res.status(400).json({ error: 'Vui lòng nhập tiêu chí nghiệm thu.' });
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

    const fullPrompt = `${systemPrompt}\n\nMã bắt đầu: ${happyId}\nTiêu chí nghiệm thu:\n${acceptanceCriteria}${imageNote}`;
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
      const shortTitle = acceptanceCriteria.split('\n')[0].slice(0, 60);
      generatedSpecs = [
        {
          id: happyId,
          title: `Luồng hợp lệ: ${shortTitle}`,
          description: acceptanceCriteria,
          tags: ['smoke', 'read-only'],
          environments: {
            allowed: ['local', 'staging', 'production'],
            blocked: [],
          },
          steps: [
            {
              id: 'step-1',
              action: 'open',
              target: '${env.BASE_URL}/Register.html',
              description: 'Mở trang biểu mẫu cần kiểm thử',
              optional: false,
            },
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
            },
          ],
          assertions: [
            {
              type: 'element_visible',
              target: '#output',
              severity: 'error',
            },
          ],
        },
        {
          id: negativeId,
          title: `Luồng ngoại lệ: Kiểm tra định dạng email không hợp lệ`,
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
              target: '${env.BASE_URL}/Register.html',
              description: 'Mở trang biểu mẫu cần kiểm thử',
              optional: false,
            },
            {
              id: 'step-2',
              action: 'input',
              target: '#userEmail',
              value: 'email-sai-dinh-dang',
              description: 'Nhập địa chỉ email sai định dạng',
              optional: false,
            },
            {
              id: 'step-3',
              action: 'click',
              target: '#submit',
              description: 'Bấm nút gửi biểu mẫu',
              optional: false,
            },
          ],
          assertions: [
            {
              type: 'element_visible',
              target: '#userEmail.field-error',
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

