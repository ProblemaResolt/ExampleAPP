import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';

// バリデーションスキーマ
const periodSchema = yup.object({
  startDate: yup.date().required('開始日は必須です'),
  endDate: yup.date()
    .nullable()
    .transform((value, originalValue) => {
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      const date = new Date(originalValue);
      return isNaN(date.getTime()) ? null : date;
    })
    .test('is-after-start', '終了日は開始日より後である必要があります', function(value) {
      const { startDate } = this.parent;
      if (!value || !startDate) return true;
      return new Date(value) > new Date(startDate);
    })
});

const ProjectMemberPeriodDialog = ({ open, onClose, member, project, onSave }) => {
  const formik = useFormik({
    initialValues: {
      startDate: member?.projectMembership?.startDate?.slice(0, 10) || '',
      endDate: member?.projectMembership?.endDate?.slice(0, 10) || ''
    },
    validationSchema: periodSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        await onSave(values);
        onClose();
      } catch (error) {
        setStatus({
          error: error.response?.data?.error || '更新に失敗しました'
        });
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
          メンバー期間の編集
        </DialogTitle>
        <DialogContent>
          {formik.status?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formik.status.error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
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
              />
            </Grid>
            <Grid item xs={12}>
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
              />
            </Grid>
          </Grid>
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