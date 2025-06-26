import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkReportModal from '../WorkReportModal';
import React from 'react';

// モック関数
const mockUpdateWorkReport = vi.fn(() => Promise.resolve(true));
const mockOnSave = vi.fn();
const mockOnClose = vi.fn();

const baseProps = {
  onClose: mockOnClose,
  date: '2025-06-23',
  timeEntry: {
    id: 'workreport-123',
    description: '詳細な作業内容',
    status: 'IN_PROGRESS'
  },
  timeEntryId: 'cmc5oaugy000d40p7agk04dix', // propsで明示的に渡す
  updateWorkReport: mockUpdateWorkReport,
  onSave: mockOnSave
};

describe('WorkReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期値が正しく表示される', () => {
    render(<WorkReportModal {...baseProps} />);
    expect(screen.getByDisplayValue('詳細な作業内容')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IN_PROGRESS')).toBeInTheDocument();
  });

  it('保存ボタンでupdateWorkReportが呼ばれonSaveも呼ばれる', async () => {
    render(<WorkReportModal {...baseProps} />);
    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockUpdateWorkReport).toHaveBeenCalledWith(expect.objectContaining({
        id: 'workreport-123',
        description: '詳細な作業内容',
        status: 'IN_PROGRESS',
        date: '2025-06-23',
        timeEntryId: 'cmc5oaugy000d40p7agk04dix'
      }));
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('キャンセルボタンでonCloseが呼ばれる', () => {
    render(<WorkReportModal {...baseProps} />);
    const cancelBtn = screen.getByText('キャンセル');
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
