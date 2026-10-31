import React, { useState } from 'react';
import { Button, Input, Space, Tag, Typography, Empty } from 'antd';
import { SpecListItem } from '../types';

interface SuiteSidebarProps {
  specs: SpecListItem[];
  selectedTestId: string | null;
  onSelectSpec: (item: SpecListItem) => void;
  onOpenGenerator: () => void;
}

export const SuiteSidebar: React.FC<SuiteSidebarProps> = ({
  specs,
  selectedTestId,
  onSelectSpec,
  onOpenGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecs = specs.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.spec.id.toLowerCase().includes(q) ||
      item.spec.title.toLowerCase().includes(q) ||
      item.spec.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const renderStatusTag = (status?: string) => {
    if (status === 'PASSED') {
      return <Tag color="success">Đạt</Tag>;
    }
    if (status === 'FAILED') {
      return <Tag color="error">Lỗi</Tag>;
    }
    if (status === 'BLOCKED') {
      return <Tag color="warning">Bị chặn</Tag>;
    }
    return <Tag color="default">Chưa chạy</Tag>;
  };

  return (
    <aside className="workspace-column">
      <div className="column-header">
        <Typography.Text strong>Danh sách kịch bản ({specs.length})</Typography.Text>
        <Button size="small" type="primary" onClick={onOpenGenerator}>
          Tạo kịch bản
        </Button>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <Input.Search
          size="small"
          placeholder="Tìm theo mã hoặc tiêu đề..."
          allowClear
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="column-body">
        {filteredSpecs.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có kịch bản phù hợp" />
        ) : (
          filteredSpecs.map((item) => {
            const isSelected = item.spec.id === selectedTestId;
            return (
              <div
                key={item.spec.id}
                className={`spec-list-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectSpec(item)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {item.spec.id}
                  </Typography.Text>
                  {renderStatusTag(item.lastRun?.status)}
                </div>

                <Typography.Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ margin: '0 0 6px 0', fontSize: 13 }}
                >
                  {item.spec.title}
                </Typography.Paragraph>

                <Space size={[4, 4]} wrap>
                  {item.prodSafety.allowed ? (
                    <Tag style={{ fontSize: 11, margin: 0 }}>An toàn Prod</Tag>
                  ) : (
                    <Tag color="error" style={{ fontSize: 11, margin: 0 }}>
                      Bị chặn trên Prod
                    </Tag>
                  )}
                  {item.spec.tags.map((tag) => (
                    <Tag key={tag} style={{ fontSize: 11, margin: 0 }}>
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

