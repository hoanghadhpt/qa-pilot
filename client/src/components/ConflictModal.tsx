import React, { useState, useEffect } from 'react';
import { Button, Modal, Radio, Space, Typography, message } from 'antd';
import { SpecConflict, TestStep } from '../types';

interface ConflictModalProps {
  open: boolean;
  projectId: string;
  conflict: SpecConflict | null;
  onClose: () => void;
  onResolved: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  open,
  projectId,
  conflict,
  onClose,
  onResolved,
}) => {
  const [choices, setChoices] = useState<Record<number, 'local' | 'remote'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (conflict) {
      const initial: Record<number, 'local' | 'remote'> = {};
      conflict.stepDiffs.forEach((d) => {
        initial[d.index] = 'local';
      });
      setChoices(initial);
    }
  }, [conflict]);

  if (!conflict) return null;

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      const resolvedSteps: TestStep[] = [];
      for (const diff of conflict.stepDiffs) {
        const pick = choices[diff.index] || 'local';
        const chosenStep = pick === 'local' ? diff.local : diff.remote;
        if (chosenStep) {
          resolvedSteps.push(chosenStep);
        }
      }

      const res = await fetch('/api/git/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          specPath: conflict.specPath,
          testId: conflict.testId,
          resolvedSteps,
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể lưu kết quả giải quyết xung đột.');
      }

      message.success('Đã giải quyết xung đột kịch bản.');
      onResolved();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi giải quyết xung đột.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Giải quyết xung đột kịch bản: ${conflict.testId}`}
      open={open}
      onCancel={onClose}
      width={720}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={isSubmitting} onClick={handleResolve}>
            Xác nhận bản gộp
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Chọn phiên bản cần giữ lại cho từng bước có xung đột:
        </Typography.Text>

        {conflict.stepDiffs.map((diff) => (
          <div
            key={diff.index}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              padding: 10,
              background: diff.hasConflict ? '#fef2f2' : 'var(--bg-surface)',
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
                Bước #{diff.index + 1}
              </Typography.Text>
              {diff.hasConflict && (
                <Radio.Group
                  size="small"
                  value={choices[diff.index] || 'local'}
                  onChange={(e) =>
                    setChoices((prev) => ({ ...prev, [diff.index]: e.target.value }))
                  }
                >
                  <Radio.Button value="local">Giữ bản cục bộ</Radio.Button>
                  <Radio.Button value="remote">Giữ bản từ kho chung</Radio.Button>
                </Radio.Group>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                <strong>Bản cục bộ:</strong>
                <div>
                  {diff.local
                    ? `[${diff.local.action}] ${diff.local.target} (${diff.local.description})`
                    : '(Không có)'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                <strong>Bản từ kho chung:</strong>
                <div>
                  {diff.remote
                    ? `[${diff.remote.action}] ${diff.remote.target} (${diff.remote.description})`
                    : '(Không có)'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </Space>
    </Modal>
  );
};

