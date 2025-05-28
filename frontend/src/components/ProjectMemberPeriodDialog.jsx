import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Box,
  Typography
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';

const ProjectMemberPeriodDialog = ({ 
  open, 
  onClose, 
  member, 
  project,
  onSave,
  projectStartDate,
  projectEndDate 
}) => {
  const formik = useFormik({
    initialValues: {
      startDate: member?.projectMembership?.startDate || '',
      endDate: member?.projectMembership?.endDate || ''
    },
    validationSchema: yup.object({
      startDate: yup.date()
        .required('開始日は必須です')
        .test(
          'minDate',
          'プロジェクトの開始日より前の日付は設定できません',
          function(value) {
            if (!value || !projectStartDate) return true;
            const startDate = new Date(value);
            const projectStart = new Date(projectStartDate);
            // 時刻部分を切り捨てて日付のみで比較
            startDate.setHours(0, 0, 0, 0);
            projectStart.setHours(0, 0, 0, 0);
            return startDate >= projectStart;
          }
        ),
      endDate: yup.date()
        .nullable()
        .transform((value, originalValue) => {
          if (originalValue === '' || originalValue === null || originalValue === undefined) {
            return null;
          }
          const date = new Date(originalValue);
          return isNaN(date.getTime()) ? null : date;
        })
        .min(
          yup.ref('startDate'),
          '終了日は開始日以降の日付を指定してください'
        )
        .test(
          'maxDate',
          'プロジェクトの終了日を超える日付は設定できません',
          function(value) {
            if (!value || !projectEndDate) return true;
            const endDate = new Date(value);
            const projectEnd = new Date(projectEndDate);
            // 時刻部分を切り捨てて日付のみで比較
            endDate.setHours(0, 0, 0, 0);
            projectEnd.setHours(0, 0, 0, 0);
            return endDate <= projectEnd;
          }
        )
    }),
    onSubmit: async (values) => {
      await onSave(values);
      onClose();
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
          メンバー期間の設定
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {member?.firstName} {member?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              プロジェクト: {project?.name}
            </Typography>
            {projectEndDate && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                プロジェクト期間: {new Date(projectStartDate).toLocaleDateString()} 〜 {new Date(projectEndDate).toLocaleDateString()}
              </Typography>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="startDate"
                  label="開始日"
                  type="date"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                  helperText={formik.touched.startDate && formik.errors.startDate}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : undefined,
                    max: projectEndDate ? new Date(projectEndDate).toISOString().split('T')[0] : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="endDate"
                  label="終了日"
                  type="date"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                  helperText={formik.touched.endDate && formik.errors.endDate}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: formik.values.startDate || (projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : undefined),
                    max: projectEndDate ? new Date(projectEndDate).toISOString().split('T')[0] : undefined
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formik.isSubmitting}
          >
            保存
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProjectMemberPeriodDialog; 