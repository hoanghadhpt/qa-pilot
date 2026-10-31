import React from 'react';
import { Button, Select, Space, Tag, Typography, Switch } from 'antd';
import { AiAgentInfo, CdpStatus, EnvironmentConfig, GitStatus } from '../types';

interface HeaderProps {
  projectId: string;
  onProjectChange: (projectId: string) => void;
  environment: string;
  environments: EnvironmentConfig[];
  onEnvironmentChange: (envName: string) => void;
  gitStatus: GitStatus;
  isSyncingGit: boolean;
  onSyncGit: () => void;
  cdpStatus: CdpStatus;
  onLaunchCdp: (headless: boolean) => void;
  aiAgents: AiAgentInfo[];
  activeAgentId: string;
  onSelectAiAgent: (agentId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectId,
  onProjectChange,
  environment,
  environments,
  onEnvironmentChange,
  gitStatus,
  isSyncingGit,
  onSyncGit,
  cdpStatus,
  onLaunchCdp,
  aiAgents,
  activeAgentId,
  onSelectAiAgent,
}) => {
  const currentEnvConfig = environments.find((e) => e.name === environment);
  const isProduction = Boolean(currentEnvConfig?.is_production || environment === 'production');

  return (
    <header className={`app-header ${isProduction ? 'is-production' : ''}`}>
      <Space size="middle">
        <Typography.Text strong style={{ fontSize: 15 }}>
          QA Pilot
        </Typography.Text>

        <Space size="small">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Dự án:
          </Typography.Text>
          <Select
            size="small"
            value={projectId}
            onChange={onProjectChange}
            style={{ width: 120 }}
            options={[{ label: 'default', value: 'default' }]}
          />
        </Space>

        <Space size="small">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Môi trường:
          </Typography.Text>
          <Select
            size="small"
            value={environment}
            onChange={onEnvironmentChange}
            style={{ width: 130 }}
            options={environments.map((env) => ({
              label: env.name.charAt(0).toUpperCase() + env.name.slice(1),
              value: env.name,
            }))}
          />
        </Space>

        {isProduction && (
          <Tag color="error" style={{ margin: 0 }}>
            Môi trường Production: Chặn kịch bản tác động dữ liệu
          </Tag>
        )}
      </Space>

      <Space size="middle">
        <Space size="small">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            AI Agent:
          </Typography.Text>
          <Select
            size="small"
            value={activeAgentId || undefined}
            placeholder="Chọn AI Agent"
            onChange={onSelectAiAgent}
            style={{ width: 245 }}
            popupMatchSelectWidth={310}
            options={aiAgents.map((agent) => ({
              value: agent.id,
              disabled: !agent.installed,
              label: agent.installed
                ? `${agent.name} · ${agent.model}`
                : `${agent.name} (Chưa cài đặt)`,
            }))}
          />
        </Space>

        <Space size="small">
          <Tag color={cdpStatus.connected ? 'success' : 'default'} style={{ margin: 0 }}>
            {cdpStatus.connected ? 'CDP: Đã kết nối (9222)' : 'CDP: Chưa kết nối'}
          </Tag>
          <Switch
            size="small"
            checked={!cdpStatus.headless}
            onChange={(checked) => onLaunchCdp(!checked)}
            checkedChildren="Hiện trình duyệt"
            unCheckedChildren="Chạy ngầm"
          />
          {!cdpStatus.connected && (
            <Button size="small" onClick={() => onLaunchCdp(cdpStatus.headless)}>
              Khởi động trình duyệt
            </Button>
          )}
        </Space>

        <Space size="small">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Git ({gitStatus.branch}): Behind {gitStatus.behind} / Ahead {gitStatus.ahead}
            {gitStatus.modified.length > 0 ? ` (${gitStatus.modified.length} thay đổi)` : ''}
          </Typography.Text>
          <Button size="small" loading={isSyncingGit} onClick={onSyncGit}>
            Đồng bộ
          </Button>
        </Space>
      </Space>
    </header>
  );
};

