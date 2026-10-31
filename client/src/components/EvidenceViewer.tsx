import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Empty,
  Image,
  Space,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { TestRunSummary } from '../types';

interface EvidenceViewerProps {
  summary: TestRunSummary | null;
  triageMessage: string | null;
  onApplySuggestedSelector: (failedStepIndex: number, suggestedSelector: string) => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  summary,
  triageMessage,
  onApplySuggestedSelector,
}) => {
  const [highlightError, setHighlightError] = useState(true);

  if (!summary && !triageMessage) {
    return (
      <section className="workspace-column">
        <div className="column-header">
          <Typography.Text strong>Bằng chứng & Phân tích lỗi</Typography.Text>
        </div>
        <div
          className="column-body"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có dữ liệu chạy kiểm thử"
          />
        </div>
      </section>
    );
  }

  const copyBugReport = async () => {
    if (!summary) return;
    const stepsText = summary.steps
      .map(
        (s, idx) =>
          `${idx + 1}. [${s.status}] ${s.description} (${s.action}) - ${s.durationMs}ms${
            s.error ? ` | Lỗi: ${s.error}` : ''
          }`
      )
      .join('\n');

    const consoleText =
      summary.evidence?.consoleErrors && summary.evidence.consoleErrors.length > 0
        ? summary.evidence.consoleErrors.join('\n')
        : 'Không có lỗi Console';

    const networkText =
      summary.evidence?.networkFailures && summary.evidence.networkFailures.length > 0
        ? summary.evidence.networkFailures
            .map((n) => `${n.method || 'GET'} ${n.url} -> ${n.status}`)
            .join('\n')
        : 'Không có lỗi mạng';

    const reportMd = [
      `# Báo cáo lỗi kiểm thử: ${summary.testId}`,
      `- **Mã lần chạy**: ${summary.runId}`,
      `- **Môi trường**: ${summary.environment}`,
      `- **Trạng thái**: ${summary.status}`,
      `- **Tổng thời gian**: ${summary.durationMs}ms`,
      '',
      '## Các bước thực hiện',
      stepsText,
      '',
      '## Phân tích nguyên nhân gốc rễ',
      `- **Nguyên nhân**: ${summary.aiDiagnosis?.rootCause || 'Không có'}`,
      `- **Khuyến nghị xử lý**: ${summary.aiDiagnosis?.recommendation || 'Không có'}`,
      '',
      '## Nhật ký Console',
      '```text',
      consoleText,
      '```',
      '',
      '## Yêu cầu mạng thất bại',
      '```text',
      networkText,
      '```',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(reportMd);
      message.success('Đã sao chép báo cáo lỗi vào bộ nhớ tạm.');
    } catch {
      message.error('Không thể sao chép vào bộ nhớ tạm.');
    }
  };

  const screenshotFile = summary?.evidence
    ? highlightError
      ? summary.evidence.annotatedScreenshot
      : summary.evidence.rawScreenshot
    : null;

  const screenshotUrl =
    summary && screenshotFile
      ? `/api/runner/artifacts/${summary.runId}/${screenshotFile}?t=${Date.now()}`
      : null;

  return (
    <section className="workspace-column">
      <div className="column-header">
        <Space size="small">
          <Typography.Text strong>Bằng chứng & Phân tích lỗi</Typography.Text>
          {summary && (
            <Tag
              color={
                summary.status === 'PASSED'
                  ? 'success'
                  : summary.status === 'FAILED'
                  ? 'error'
                  : 'warning'
              }
              style={{ margin: 0 }}
            >
              {summary.status} ({summary.durationMs}ms)
            </Tag>
          )}
        </Space>

        {summary && (
          <Button size="small" onClick={copyBugReport}>
            Sao chép báo cáo
          </Button>
        )}
      </div>

      <div className="column-body">
        {triageMessage && (
          <Alert
            type="info"
            message={triageMessage}
            style={{ marginBottom: 12 }}
          />
        )}

        {summary && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {summary.aiDiagnosis && (
              <Card
                size="small"
                title="Phân tích nguyên nhân"
                style={{
                  borderColor: summary.status === 'FAILED' ? '#fca5a5' : 'var(--border-color)',
                }}
              >
                <Typography.Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
                  <strong>Nguyên nhân:</strong> {summary.aiDiagnosis.rootCause}
                </Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
                  <strong>Hướng xử lý:</strong> {summary.aiDiagnosis.recommendation}
                </Typography.Paragraph>
                {summary.aiDiagnosis.suggestedSelector &&
                  summary.failedStepIndex !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-subtle)',
                        padding: '6px 10px',
                        borderRadius: 4,
                      }}
                    >
                      <Typography.Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                        Bộ chọn gợi ý: {summary.aiDiagnosis.suggestedSelector}
                      </Typography.Text>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() =>
                          onApplySuggestedSelector(
                            summary.failedStepIndex!,
                            summary.aiDiagnosis!.suggestedSelector!
                          )
                        }
                      >
                        Áp dụng bộ chọn
                      </Button>
                    </div>
                  )}
              </Card>
            )}

            {screenshotUrl && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    Ảnh chụp màn hình tại bước lỗi
                  </Typography.Text>
                  <Checkbox
                    checked={highlightError}
                    onChange={(e) => setHighlightError(e.target.checked)}
                  >
                    <Typography.Text style={{ fontSize: 12 }}>
                      Hiển thị vùng lỗi
                    </Typography.Text>
                  </Checkbox>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={screenshotUrl}
                    alt="Ảnh chụp màn hình bước kiểm thử"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              </div>
            )}

            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Tiến trình thực thi ({summary.steps.length} bước)
              </Typography.Text>
              <Timeline
                items={summary.steps.map((s, idx) => ({
                  color:
                    s.status === 'PASSED'
                      ? 'green'
                      : s.status === 'FAILED'
                      ? 'red'
                      : s.status === 'SKIPPED'
                      ? 'gray'
                      : 'blue',
                  children: (
                    <div style={{ fontSize: 12 }}>
                      <div>
                        <strong>
                          #{idx + 1} [{s.action}]
                        </strong>{' '}
                        {s.description}{' '}
                        <Typography.Text type="secondary">({s.durationMs}ms)</Typography.Text>
                      </div>
                      {s.error && (
                        <Typography.Text type="danger" style={{ fontSize: 12 }}>
                          {s.error}
                        </Typography.Text>
                      )}
                    </div>
                  ),
                }))}
              />
            </div>

            <Divider style={{ margin: '4px 0' }} />

            <div>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                Nhật ký lỗi Console & Mạng
              </Typography.Text>
              <div className="console-box">
                {summary.evidence &&
                (summary.evidence.consoleErrors.length > 0 ||
                  summary.evidence.networkFailures.length > 0) ? (
                  <>
                    {summary.evidence.consoleErrors.map((err, i) => (
                      <div key={`c-${i}`} style={{ color: '#fca5a5', marginBottom: 4 }}>
                        [Console] {err}
                      </div>
                    ))}
                    {summary.evidence.networkFailures.map((net, i) => (
                      <div key={`n-${i}`} style={{ color: '#fcd34d', marginBottom: 4 }}>
                        [Network {net.status}] {net.method || 'GET'} {net.url}
                      </div>
                    ))}
                  </>
                ) : (
                  <span style={{ color: '#9ca3af' }}>Không ghi nhận lỗi Console hoặc lỗi mạng.</span>
                )}
              </div>
            </div>
          </Space>
        )}
      </div>
    </section>
  );
};

