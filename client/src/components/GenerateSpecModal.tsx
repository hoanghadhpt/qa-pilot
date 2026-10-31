import React, { useState } from 'react';
import { Button, Input, Modal, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { TestSpec } from '../types';

interface GenerateSpecModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSavedSpecs: (specs: TestSpec[]) => void;
}

export const GenerateSpecModal: React.FC<GenerateSpecModalProps> = ({
  open,
  projectId,
  onClose,
  onSavedSpecs,
}) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [explorationResult, setExplorationResult] = useState<{
    url: string;
    title: string;
    elements: Array<{ selector: string; label: string; suggestedAction: string }>;
    a11ySummary: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedSpecs, setGeneratedSpecs] = useState<TestSpec[]>([]);

  const handleExplore = async () => {
    if (!targetUrl.trim()) {
      message.warning('Vui lòng nhập địa chỉ URL cần khám phá.');
      return;
    }

    setIsExploring(true);
    try {
      const res = await fetch('/api/generator/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim(), projectId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể khám phá trang web qua CDP.');
      }

      const data = await res.json();
      setExplorationResult(data);
      message.success(
        `Đã khám phá trang: phát hiện ${data.elements?.length || 0} phần tử tương tác.`
      );
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi kết nối CDP khám phá trang.');
    } finally {
      setIsExploring(false);
    }
  };

  const handleGenerate = async () => {
    if (!acceptanceCriteria.trim() && !targetUrl.trim()) {
      message.warning('Vui lòng nhập tiêu chí nghiệm thu hoặc URL trang web.');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('acceptanceCriteria', acceptanceCriteria);
      formData.append('targetUrl', targetUrl.trim());
      if (explorationResult?.a11ySummary) {
        formData.append('discoveredSummary', explorationResult.a11ySummary);
      }
      if (fileList[0]?.originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }

      const res = await fetch('/api/generator/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Không thể tạo kịch bản.');
      }

      const data = await res.json();
      setGeneratedSpecs(data.generatedSpecs || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi tạo kịch bản.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (generatedSpecs.length === 0) return;
    setIsSaving(true);
    try {
      const savedList: TestSpec[] = [];
      for (const spec of generatedSpecs) {
        const res = await fetch('/api/specs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, spec }),
        });
        if (res.ok) {
          const data = await res.json();
          savedList.push(data.spec);
        }
      }
      message.success(`Đã lưu ${savedList.length} kịch bản vào dự án.`);
      onSavedSpecs(savedList);
      setGeneratedSpecs([]);
      setAcceptanceCriteria('');
      setTargetUrl('');
      setExplorationResult(null);
      setFileList([]);
      onClose();
    } catch {
      message.error('Lỗi khi lưu kịch bản mới.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Tạo kịch bản kiểm thử"
      open={open}
      onCancel={onClose}
      width={720}
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button loading={isGenerating} onClick={handleGenerate}>
            Tạo danh sách đề xuất
          </Button>
          <Button
            type="primary"
            disabled={generatedSpecs.length === 0}
            loading={isSaving}
            onClick={handleSaveAll}
          >
            Lưu vào dự án ({generatedSpecs.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
            Khám phá trang web thực tế qua CDP (Explore Live Page)
          </Typography.Text>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://demo.automationtesting.in/Register.html hoặc URL cần kiểm thử"
              style={{ fontFamily: 'monospace' }}
            />
            <Button loading={isExploring} onClick={handleExplore}>
              Khám phá trang
            </Button>
          </div>

          {explorationResult && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 12px',
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Tiêu đề: {explorationResult.title || '(Không có tiêu đề)'}
                </Typography.Text>
                <Tag color="processing">
                  {explorationResult.elements.length} phần tử tương tác
                </Tag>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                {explorationResult.elements.slice(0, 16).map((el, idx) => (
                  <Tag key={idx} style={{ fontSize: 11, fontFamily: 'monospace', margin: 0 }}>
                    {el.selector}
                  </Tag>
                ))}
                {explorationResult.elements.length > 16 && (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    +{explorationResult.elements.length - 16} phần tử khác
                  </Typography.Text>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
            Tiêu chí nghiệm thu (Acceptance Criteria)
          </Typography.Text>
          <Input.TextArea
            rows={3}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="Nhập mô tả yêu cầu hoặc các bước nghiệp vụ cần kiểm thử..."
          />
        </div>

        <div>
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
            Ảnh chụp thiết kế giao diện (không bắt buộc)
          </Typography.Text>
          <Upload.Dragger
            multiple={false}
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([file]);
              return false;
            }}
            onRemove={() => setFileList([])}
          >
            <Typography.Text style={{ fontSize: 13 }}>
              Kéo thả tệp ảnh thiết kế vào đây hoặc bấm để chọn tệp
            </Typography.Text>
          </Upload.Dragger>
        </div>

        {generatedSpecs.length > 0 && (
          <div>
            <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Kịch bản đề xuất ({generatedSpecs.length})
            </Typography.Text>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {generatedSpecs.map((spec) => (
                <div
                  key={spec.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <Space size="small" style={{ marginBottom: 4 }}>
                    <Tag style={{ margin: 0 }}>{spec.id}</Tag>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {spec.title}
                    </Typography.Text>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    Số bước: {spec.steps.length} | Nhãn: {spec.tags.join(', ')}
                  </Typography.Text>
                </div>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </Modal>
  );
};

