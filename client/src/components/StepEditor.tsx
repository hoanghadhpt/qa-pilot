import React, { useEffect } from 'react';
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Empty,
} from 'antd';
import { StepAction, TestSpec, TestStep, TestAssertion, AssertionType } from '../types';
import { LiveStepProgress } from '../hooks/useTestRunner';

interface StepEditorProps {
  spec: TestSpec | null;
  prodSafety: { allowed: boolean; reason: string | null };
  availableHelpers: string[];
  isRunning: boolean;
  isSaving: boolean;
  stepProgress: LiveStepProgress;
  onChangeSpec: (updated: TestSpec) => void;
  onSaveSpec: () => void;
  onRunFullSpec: () => void;
  onRunSingleStep: (stepId: string) => void;
  onStopRun: () => void;
}

const ACTION_OPTIONS: Array<{ label: string; value: StepAction }> = [
  { label: 'Mở trang (open)', value: 'open' },
  { label: 'Nhập liệu (input)', value: 'input' },
  { label: 'Bấm chọn (click)', value: 'click' },
  { label: 'Cuộn trang (scroll)', value: 'scroll' },
  { label: 'Chờ (wait)', value: 'wait' },
  { label: 'Kiểm chứng (assert)', value: 'assert' },
];

const ASSERTION_TYPE_OPTIONS: Array<{ label: string; value: AssertionType }> = [
  { label: 'Phần tử hiển thị (element_visible)', value: 'element_visible' },
  { label: 'Văn bản hiển thị (text_visible)', value: 'text_visible' },
  { label: 'URL chứa chuỗi (url_contains)', value: 'url_contains' },
  { label: 'Không có lỗi console (no_console_errors)', value: 'no_console_errors' },
];

const SEVERITY_OPTIONS = [
  { label: 'Lỗi chặn (error)', value: 'error' },
  { label: 'Cảnh báo (warning)', value: 'warning' },
];

export const StepEditor: React.FC<StepEditorProps> = ({
  spec,
  prodSafety,
  availableHelpers,
  isRunning,
  isSaving,
  stepProgress,
  onChangeSpec,
  onSaveSpec,
  onRunFullSpec,
  onRunSingleStep,
  onStopRun,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (spec && !isSaving) {
          onSaveSpec();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (spec && !isRunning && prodSafety.allowed) {
          onRunFullSpec();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spec, isSaving, isRunning, prodSafety.allowed, onSaveSpec, onRunFullSpec]);

  if (!spec) {
    return (
      <main className="workspace-column">
        <div className="column-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn một kịch bản ở cột bên trái để chỉnh sửa" />
        </div>
      </main>
    );
  }

  const updateStep = (index: number, patch: Partial<TestStep>) => {
    const nextSteps = spec.steps.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    onChangeSpec({ ...spec, steps: nextSteps });
  };

  const addStep = () => {
    const nextIdx = spec.steps.length + 1;
    const newStep: TestStep = {
      id: `step-${nextIdx}`,
      action: 'click',
      target: '',
      description: `Bước ${nextIdx}`,
      optional: false,
    };
    onChangeSpec({ ...spec, steps: [...spec.steps, newStep] });
  };

  const removeStep = (index: number) => {
    if (spec.steps.length <= 1) return;
    const nextSteps = spec.steps.filter((_, idx) => idx !== index);
    onChangeSpec({ ...spec, steps: nextSteps });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= spec.steps.length) return;
    const nextSteps = [...spec.steps];
    const [moved] = nextSteps.splice(index, 1);
    nextSteps.splice(targetIdx, 0, moved);
    onChangeSpec({ ...spec, steps: nextSteps });
  };

  const updateAssertion = (index: number, patch: Partial<TestAssertion>) => {
    const nextAssertions = (spec.assertions || []).map((a, idx) =>
      idx === index ? { ...a, ...patch } : a
    );
    onChangeSpec({ ...spec, assertions: nextAssertions });
  };

  const addAssertion = () => {
    const newAssertion: TestAssertion = {
      type: 'element_visible',
      target: '',
      severity: 'error',
    };
    onChangeSpec({ ...spec, assertions: [...(spec.assertions || []), newAssertion] });
  };

  const removeAssertion = (index: number) => {
    const nextAssertions = (spec.assertions || []).filter((_, idx) => idx !== index);
    onChangeSpec({ ...spec, assertions: nextAssertions });
  };

  const renderVariablePicker = (onSelectToken: (token: string) => void) => (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <div style={{ maxWidth: 280 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            Chọn biến để chèn:
          </Typography.Text>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {availableHelpers.map((token) => (
              <Button
                key={token}
                size="small"
                type="text"
                block
                style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}
                onClick={() => onSelectToken(token)}
              >
                {token}
              </Button>
            ))}
          </Space>
        </div>
      }
    >
      <Button size="small">Chèn biến</Button>
    </Popover>
  );

  return (
    <main className="workspace-column">
      <div className="column-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size="small">
            <Tag style={{ margin: 0 }}>{spec.id}</Tag>
            <Input
              size="small"
              value={spec.title}
              onChange={(e) => onChangeSpec({ ...spec, title: e.target.value })}
              style={{ fontWeight: 600, width: 340 }}
            />
          </Space>
        </div>

        <Space size="small">
          <Button size="small" loading={isSaving} onClick={onSaveSpec}>
            Lưu
          </Button>
          {isRunning ? (
            <Button size="small" danger onClick={onStopRun}>
              Dừng
            </Button>
          ) : (
            <Tooltip title={!prodSafety.allowed ? prodSafety.reason : undefined}>
              <Button
                size="small"
                type="primary"
                disabled={!prodSafety.allowed}
                onClick={onRunFullSpec}
              >
                Chạy kiểm thử
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      <div className="column-body">
        {spec.steps.map((step, idx) => {
          const live = stepProgress[step.id];
          const statusClass =
            live?.status === 'RUNNING'
              ? 'is-running'
              : live?.status === 'PASSED'
              ? 'is-passed'
              : live?.status === 'FAILED'
              ? 'is-failed'
              : '';

          const showValueField = step.action === 'input';

          return (
            <div key={step.id} className={`step-card ${statusClass}`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <Space size="small">
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    #{idx + 1} ({step.id})
                  </Typography.Text>
                  <Select
                    size="small"
                    value={step.action}
                    options={ACTION_OPTIONS}
                    onChange={(val) => updateStep(idx, { action: val })}
                    style={{ width: 165 }}
                  />
                  {live?.status && (
                    <Tag
                      color={
                        live.status === 'PASSED'
                          ? 'success'
                          : live.status === 'FAILED'
                          ? 'error'
                          : live.status === 'RUNNING'
                          ? 'processing'
                          : 'default'
                      }
                      style={{ margin: 0 }}
                    >
                      {live.status}
                      {live.durationMs !== undefined ? ` (${live.durationMs}ms)` : ''}
                    </Tag>
                  )}
                </Space>

                <Space size={4}>
                  <Button
                    size="small"
                    disabled={isRunning || !prodSafety.allowed}
                    onClick={() => onRunSingleStep(step.id)}
                  >
                    Chạy bước này
                  </Button>
                  <Button
                    size="small"
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, -1)}
                  >
                    Lên
                  </Button>
                  <Button
                    size="small"
                    disabled={idx === spec.steps.length - 1}
                    onClick={() => moveStep(idx, 1)}
                  >
                    Xuống
                  </Button>
                  <Button
                    size="small"
                    danger
                    disabled={spec.steps.length <= 1}
                    onClick={() => removeStep(idx)}
                  >
                    Xóa
                  </Button>
                </Space>
              </div>

              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input
                  size="small"
                  addonBefore="Mô tả"
                  value={step.description}
                  onChange={(e) => updateStep(idx, { description: e.target.value })}
                  placeholder="Mô tả bước thực hiện"
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    size="small"
                    addonBefore={
                      step.action === 'open'
                        ? 'URL đích'
                        : step.action === 'scroll'
                        ? 'Vị trí cuộn'
                        : step.action === 'wait'
                        ? 'Điều kiện chờ'
                        : 'Bộ chọn'
                    }
                    value={step.target}
                    onChange={(e) => updateStep(idx, { target: e.target.value })}
                    placeholder={
                      step.action === 'open'
                        ? '${env.BASE_URL}/Register.html'
                        : step.action === 'scroll'
                        ? 'bottom, top, hoặc bộ chọn phần tử (vd: footer)'
                        : step.action === 'wait'
                        ? 'Thời gian ms (vd: 1500) hoặc bộ chọn phần tử'
                        : '#userName hoặc button[type="submit"]'
                    }
                    style={{ fontFamily: 'monospace' }}
                  />
                  {step.action === 'open' &&
                    renderVariablePicker((token) =>
                      updateStep(idx, { target: `${step.target || ''}${token}` })
                    )}
                </div>

                {showValueField && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {step.sensitive ? (
                      <Input.Password
                        size="small"
                        addonBefore="Giá trị"
                        value={step.value || ''}
                        onChange={(e) => updateStep(idx, { value: e.target.value })}
                        placeholder="Giá trị nhạy cảm hoặc ${secret.X}"
                        style={{ fontFamily: 'monospace' }}
                      />
                    ) : (
                      <Input
                        size="small"
                        addonBefore="Giá trị"
                        value={step.value || ''}
                        onChange={(e) => updateStep(idx, { value: e.target.value })}
                        placeholder="Giá trị nhập hoặc ${fixture.X}"
                        style={{ fontFamily: 'monospace' }}
                      />
                    )}
                    {renderVariablePicker((token) => updateStep(idx, { value: token }))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    size="small"
                    addonBefore={step.action === 'assert' ? 'Kỳ vọng' : 'Kỳ vọng sau bước'}
                    value={step.expected || ''}
                    onChange={(e) => updateStep(idx, { expected: e.target.value })}
                    placeholder={
                      step.action === 'assert'
                        ? 'Văn bản hoặc thuộc tính mong đợi'
                        : 'Bộ chọn hoặc URL mong đợi (tùy chọn)'
                    }
                    style={{ fontFamily: 'monospace' }}
                  />
                  {renderVariablePicker((token) => updateStep(idx, { expected: token }))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 2,
                  }}
                >
                  <Space size="middle">
                    <Checkbox
                      checked={step.optional}
                      onChange={(e) => updateStep(idx, { optional: e.target.checked })}
                    >
                      <Typography.Text style={{ fontSize: 12 }}>
                        Bước tùy chọn (không dừng test nếu lỗi)
                      </Typography.Text>
                    </Checkbox>

                    {showValueField && (
                      <Checkbox
                        checked={Boolean(step.sensitive)}
                        onChange={(e) => updateStep(idx, { sensitive: e.target.checked })}
                      >
                        <Typography.Text style={{ fontSize: 12 }}>
                          Dữ liệu nhạy cảm (che trong log)
                        </Typography.Text>
                      </Checkbox>
                    )}
                  </Space>

                  {step.optional && (
                    <Space size={4}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Thời gian chờ (ms):
                      </Typography.Text>
                      <InputNumber
                        size="small"
                        min={500}
                        max={30000}
                        step={500}
                        value={step.timeout_ms ?? 1500}
                        onChange={(val) =>
                          updateStep(idx, { timeout_ms: typeof val === 'number' ? val : 1500 })
                        }
                        style={{ width: 90 }}
                      />
                    </Space>
                  )}
                </div>
              </Space>
            </div>
          );
        })}

        <Button size="small" block onClick={addStep} style={{ marginTop: 8 }}>
          Thêm bước kiểm thử
        </Button>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Typography.Text strong style={{ fontSize: 12 }}>
              Điều kiện kiểm chứng kịch bản (Assertions)
            </Typography.Text>
            <Button size="small" onClick={addAssertion}>
              Thêm điều kiện
            </Button>
          </div>

          {(!spec.assertions || spec.assertions.length === 0) ? (
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              Chưa thiết lập điều kiện kiểm chứng toàn bộ kịch bản.
            </Typography.Text>
          ) : (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {spec.assertions.map((assertion, aIdx) => (
                <div
                  key={aIdx}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: assertion.type === 'no_console_errors' ? 0 : 6,
                    }}
                  >
                    <Select
                      size="small"
                      value={assertion.type}
                      options={ASSERTION_TYPE_OPTIONS}
                      onChange={(val) => updateAssertion(aIdx, { type: val })}
                      style={{ flex: 1, minWidth: 200 }}
                    />
                    <Select
                      size="small"
                      value={assertion.severity || 'error'}
                      options={SEVERITY_OPTIONS}
                      onChange={(val) =>
                        updateAssertion(aIdx, { severity: val as 'error' | 'warning' })
                      }
                      style={{ width: 140 }}
                    />
                    <Button
                      size="small"
                      danger
                      onClick={() => removeAssertion(aIdx)}
                    >
                      Xóa
                    </Button>
                  </div>

                  {assertion.type !== 'no_console_errors' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Input
                        size="small"
                        addonBefore="Mục tiêu"
                        value={assertion.target || ''}
                        onChange={(e) => updateAssertion(aIdx, { target: e.target.value })}
                        placeholder={
                          assertion.type === 'url_contains'
                            ? 'Chuỗi trong URL (vd: /Register.html)'
                            : assertion.type === 'text_visible'
                            ? 'Văn bản mong đợi (vd: Register)'
                            : 'Bộ chọn phần tử (vd: #basicBootstrapForm)'
                        }
                        style={{ fontFamily: 'monospace' }}
                      />
                      {renderVariablePicker((token) =>
                        updateAssertion(aIdx, { target: `${assertion.target || ''}${token}` })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </Space>
          )}
        </div>
      </div>
    </main>
  );
};

