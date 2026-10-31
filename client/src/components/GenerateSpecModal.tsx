import React, { useState } from 'react';
import { Button, Input, Modal, Space, Tag, Typography, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { ExplorationScreenTrace, TestSpec } from '../types';

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
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [explorationTrace, setExplorationTrace] = useState<ExplorationScreenTrace[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedSpecs, setGeneratedSpecs] = useState<TestSpec[]>([]);

  const handleGenerate = async () => {
    if (!acceptanceCriteria.trim()) {
      message.warning('Vui lòng nhập yêu cầu kiểm thử.');
      return;
    }

    setIsGenerating(true);
    setExplorationTrace([]);
    setGeneratedSpecs([]);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('acceptanceCriteria', acceptanceCriteria.trim());
      if (fileList[0]?.originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }

      const res = await fetch('/api/generator/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể tạo kịch bản.');
      }

      const data = await res.json();
      setExplorationTrace(data.explorationTrace || []);
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
      setExplorationTrace([]);
      setAcceptanceCriteria('');
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
            Phân tích & Tạo kịch bản
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
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
            Mô tả yêu cầu kiểm thử (Prompt)
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Nhập mô tả tự nhiên kèm đường dẫn URL (nếu có). Hệ thống sẽ tự động mở trình duyệt qua CDP, đi qua các màn hình, cuộn trang và trích xuất bộ chọn thực tế.
          </Typography.Text>
          <Input.TextArea
            rows={4}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="Ví dụ: Truy cập https://vnexpress.net/ Cuộn xuống cuối cùng, đảm bảo hiển thị trường 'Email: bandoc@vnexpress.net' ở phần footer"
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

        {isGenerating && (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
            }}
          >
            <Typography.Text style={{ fontSize: 12 }}>
              Đang tự động mở trình duyệt CDP, khám phá các màn hình và thiết kế các bước kiểm thử...
            </Typography.Text>
          </div>
        )}

        {explorationTrace.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
            }}
          >
            <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              Nhật ký tự động khám phá trang ({explorationTrace.length} màn hình)
            </Typography.Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {explorationTrace.map((trace) => (
                <div
                  key={trace.screenIndex}
                  style={{
                    fontSize: 12,
                    padding: '6px 8px',
                    background: '#fff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Typography.Text strong style={{ fontSize: 12 }}>
                      Màn hình {trace.screenIndex}: {trace.title || trace.url}
                    </Typography.Text>
                    <Tag style={{ margin: 0, fontSize: 11 }}>{trace.elementCount} phần tử</Tag>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {trace.actionExecuted}
                  </Typography.Text>
                  {trace.matchedTexts && trace.matchedTexts.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Array.from(new Set(trace.matchedTexts.map((mt) => mt.selector))).map((sel, idx) => (
                        <Tag key={idx} color="processing" style={{ margin: 0, fontSize: 11, fontFamily: 'monospace' }}>
                          {sel}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </div>
        )}

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
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    Số bước: {spec.steps.length} | Nhãn: {spec.tags.join(', ')}
                  </Typography.Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {spec.steps.map((st, sIdx) => (
                      <div
                        key={st.id}
                        style={{
                          fontSize: 12,
                          fontFamily: 'monospace',
                          padding: '3px 6px',
                          background: 'var(--surface-color)',
                          borderRadius: 3,
                        }}
                      >
                        #{sIdx + 1} [{st.action}] {st.target}
                        {st.expected ? ` -> kỳ vọng: ${st.expected}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </Modal>
  );
};

