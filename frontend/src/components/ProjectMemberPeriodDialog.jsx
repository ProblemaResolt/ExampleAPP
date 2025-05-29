import React from 'react';
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
      startDate: member?.projectMembership?.startDate ? new Date(member.projectMembership.startDate).toISOString().split('T')[0] : '',
      endDate: member?.projectMembership?.endDate ? new Date(member.projectMembership.endDate).toISOString().split('T')[0] : ''
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

  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '500px' }}>
        <header className="w3-container w3-blue">
          <h3>メンバー期間の設定</h3>
        </header>
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container">
            <div className="w3-padding">
              <h4>{member?.firstName} {member?.lastName}</h4>
              <p className="w3-text-gray">プロジェクト: {project?.name}</p>
              {projectEndDate && (
                <p className="w3-text-gray">
                  プロジェクト期間: {new Date(projectStartDate).toLocaleDateString()} 〜 {new Date(projectEndDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>開始日</label>
                <input
                  className={`w3-input w3-border ${formik.touched.startDate && formik.errors.startDate ? 'w3-border-red' : ''}`}
                  type="date"
                  name="startDate"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  min={projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : undefined}
                  max={projectEndDate ? new Date(projectEndDate).toISOString().split('T')[0] : undefined}
                />
                {formik.touched.startDate && formik.errors.startDate && (
                  <div className="w3-text-red">{formik.errors.startDate}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>終了日</label>
                <input
                  className={`w3-input w3-border ${formik.touched.endDate && formik.errors.endDate ? 'w3-border-red' : ''}`}
                  type="date"
                  name="endDate"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  min={formik.values.startDate || (projectStartDate ? new Date(projectStartDate).toISOString().split('T')[0] : undefined)}
                  max={projectEndDate ? new Date(projectEndDate).toISOString().split('T')[0] : undefined}
                />
                {formik.touched.endDate && formik.errors.endDate && (
                  <div className="w3-text-red">{formik.errors.endDate}</div>
                )}
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button type="button" className="w3-button w3-gray" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={formik.isSubmitting}
            >
              保存
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectMemberPeriodDialog; 