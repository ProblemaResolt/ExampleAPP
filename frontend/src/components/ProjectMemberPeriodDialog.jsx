import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';

const ProjectMemberPeriodDialog = ({ 
  open, 
  onClose, 
  member, 
  project, 
  onSave, 
  projectStartDate, 
  projectEndDate 
}) => {
  const [startDate, setStartDate] = useState(member.projectMembership?.startDate || null);
  const [endDate, setEndDate] = useState(member.projectMembership?.endDate || null);
  const [error, setError] = useState(null);

  // 日付の制約を設定
  const minStartDate = new Date(projectStartDate);
  const maxEndDate = projectEndDate ? new Date(projectEndDate) : null;

  useEffect(() => {
    if (open) {
      setStartDate(member.projectMembership?.startDate || null);
      setEndDate(member.projectMembership?.endDate || null);
      setError(null);
    }
  }, [open, member]);

  const handleSave = () => {
    // バリデーション
    if (!startDate) {
      setError('開始日は必須です');
      return;
    }

    if (endDate && new Date(startDate) > new Date(endDate)) {
      setError('終了日は開始日より後の日付を設定してください');
      return;
    }

    if (new Date(startDate) < minStartDate) {
      setError('開始日はプロジェクトの開始日以降に設定してください');
      return;
    }

    if (maxEndDate && endDate && new Date(endDate) > maxEndDate) {
      setError('終了日はプロジェクトの終了日以前に設定してください');
      return;
    }

    onSave({
      startDate: startDate,
      endDate: endDate
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {member.firstName} {member.lastName}の期間を編集
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} locale={ja}>
            <DatePicker
              label="開始日"
              value={startDate}
              onChange={(newValue) => {
                setStartDate(newValue);
                setError(null);
              }}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDate={minStartDate}
              maxDate={maxEndDate || undefined}
            />
            <DatePicker
              label="終了日"
              value={endDate}
              onChange={(newValue) => {
                setEndDate(newValue);
                setError(null);
              }}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDate={new Date(startDate)}
              maxDate={maxEndDate || undefined}
            />
          </LocalizationProvider>
          {error && (
            <Box sx={{ color: 'error.main', mt: 1 }}>
              {error}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectMemberPeriodDialog;