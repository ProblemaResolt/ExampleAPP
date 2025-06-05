import React, { useEffect, useRef, useState } from "react";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";

const EmployeeDialog = ({
  open,
  onClose,
  employee,
  onSubmit,
  formik,
  skills: skillsProp,
}) => {
  const prevSkillsLength = useRef(formik.values.skills.length);
  const [skillInput, setSkillInput] = useState("");
  const [debouncedSkillInput, setDebouncedSkillInput] = useState("");
  const inputRef = useRef();

  // debounced skill search - 300ms待ってから検索実行（短めに設定）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkillInput(skillInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [skillInput]);

  useEffect(() => {
    setSkillInput(""); // ダイアログが開かれた時に入力欄をクリア
  }, [open]);

  useEffect(() => {
    if (formik.values.skills.length > prevSkillsLength.current) {
      const selects = document.querySelectorAll(".employee-skill-select");
      if (selects.length > 0) {
        selects[selects.length - 1].focus();
        selects[selects.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
    prevSkillsLength.current = formik.values.skills.length;
  }, [formik.values.skills.length]); // スキル選択（既存スキルのみ）
  const handleSelectSkill = (skill) => {
    // 既に選択済みなら追加しない
    if (formik.values.skills.some((s) => s.skillId === skill.id)) return;

    formik.setFieldValue("skills", [
      ...(formik.values.skills || []),
      { skillId: skill.id, years: "" },
    ]);
    setSkillInput("");
    inputRef.current?.focus();
  };

  if (!open) return null;
  return (
    <div className="w3-modal" style={{ display: "block" }}>
      <div
        className="w3-modal-content w3-card-4 w3-animate-zoom"
        style={{ maxWidth: "90vw", width: 'auto', zIndex: 1001 }}
      >
        <header className="w3-container w3-blue">
          <span
            className="w3-button w3-display-topright w3-hover-red w3-large"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>{employee ? "社員を編集" : "社員を追加"}</h3>        </header>
          {!employee && (
          <div className="w3-container w3-padding w3-pale-blue w3-border-bottom">
            <p className="w3-small w3-margin-bottom">
              <strong>📧 メール通知について:</strong><br />
              新しい社員を追加すると、以下のメールが自動送信されます：
            </p>
            <ul className="w3-small w3-margin-left">
              <li>自動生成された安全なログイン情報（メールアドレスとパスワード）</li>
              <li>メールアドレス確認リンク</li>
            </ul>
            <p className="w3-small w3-text-gray">
              セキュリティのため、パスワードは自動生成されます。社員は初回ログイン後にパスワードを変更できます。
            </p>
          </div>
        )}
        
        <form onSubmit={onSubmit}>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>
                  <FaUser className="w3-margin-right" />
                  名前（姓）
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.lastName && formik.errors.lastName
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.lastName}
                  </div>
                )}
              </div>
              <div className="w3-col m6">
                <label>
                  <FaUser className="w3-margin-right" />
                  名前（名）
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.firstName && formik.errors.firstName
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.firstName}
                  </div>
                )}
              </div>
            </div>
            <div className="w3-row-padding w3-margin-top">
              <div className="w3-col m6">
                <label>
                  <FaEnvelope className="w3-margin-right" />
                  メールアドレス
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.email && formik.errors.email
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.email}
                  </div>
                )}
              </div>              <div className="w3-col m6">
                <label>
                  <FaPhone className="w3-margin-right" />
                  電話番号
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.phone && formik.errors.phone
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="phone"
                  type="tel"
                  value={formik.values.phone || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="例: 090-1234-5678"
                />
                {formik.touched.phone && formik.errors.phone && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.phone}
                  </div>
                )}
              </div>
            </div>
            <div className="w3-row-padding w3-margin-top">
              <div className="w3-col m6">
                <label>ロール</label>
                <select
                  className={`w3-select w3-border ${
                    formik.touched.role && formik.errors.role
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">ロールを選択</option>
                  <option value="MANAGER">マネージャー</option>
                  <option value="MEMBER">メンバー</option>
                </select>
                {formik.touched.role && formik.errors.role && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.role}
                  </div>
                )}
              </div>

            </div>            <div className="w3-row-padding w3-margin-top">
              <div className="w3-col m4">
                <label>
                  <FaMapMarkerAlt className="w3-margin-right" />
                  都道府県
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.prefecture && formik.errors.prefecture
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="prefecture"
                  value={formik.values.prefecture || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="例: 東京都"
                />
                {formik.touched.prefecture && formik.errors.prefecture && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.prefecture}
                  </div>
                )}
              </div>
              <div className="w3-col m4">
                <label>市町村</label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.city && formik.errors.city
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="city"
                  value={formik.values.city || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="例: 渋谷区"
                />
                {formik.touched.city && formik.errors.city && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.city}
                  </div>
                )}
              </div>
              <div className="w3-col m4">
                <label>番地・建物名</label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.streetAddress && formik.errors.streetAddress
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="streetAddress"
                  value={formik.values.streetAddress || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="例: 渋谷1-1-1 渋谷ビル10F"
                />
                {formik.touched.streetAddress && formik.errors.streetAddress && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.streetAddress}
                  </div>
                )}
              </div>
            </div>
            <div className="w3-padding w3-margin-top">
              <div className="w3-col m12">
                <label>役職</label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.position && formik.errors.position
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="position"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.position && formik.errors.position && (
                  <div className="w3-text-red w3-small">
                    {formik.errors.position}
                  </div>
                )}
              </div>
            </div>{" "}            <div className="w3-margin-top">
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "inline-block" }}>スキルセットと経験年数</label>
                {(!skillsProp || skillsProp.length === 0) && (
                  <div className="w3-panel w3-pale-yellow w3-border-yellow w3-margin-top">
                    <p><strong>⚠️ 注意:</strong> 会社に登録されているスキルがありません。</p>
                    <p>スキル管理画面で必要なスキルを会社に追加してから社員にスキルを割り当ててください。</p>
                  </div>
                )}
                
                <ul className="user-skill-list">
                {(formik.values.skills || [])
                  .filter((skillObj) => skillObj.skillId)
                  .map((skillObj, idx) => {
                    const skill = Array.isArray(skillsProp) 
                      ? skillsProp.find((s) => s.id === skillObj.skillId)
                      : null;
                    if (!skill) return null;return (
                      <li
                        key={skillObj.skillId}
                        style={{ 
                          display: "flex",
                          alignItems: "center", 
                          padding: "8px", 
                          marginBottom: "4px",
                          backgroundColor: "#e3f2fd",
                          border: "1px solid #bbdefb",
                          borderRadius: "4px"
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: "8px", fontWeight: "500" }}>
                          {skill.name}
                        </div>                        <div style={{ 
                          display: "flex", 
                          alignItems: "center",
                          paddingRight: "8px",
                          minWidth: "120px"
                        }}>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            placeholder="経験年数を入力してください。"
                            value={skillObj.years}
                            onChange={(e) => {
                              const newSkills = [
                                ...(formik.values.skills || []),
                              ];
                              newSkills[idx].years = e.target.value;
                              formik.setFieldValue("skills", newSkills);
                            }}
                            className="w3-input w3-border w3-small"
                          />
                          <span style={{ 
                            verticalAlign: "middle",
                            lineHeight: "normal"
                          }}>
                            年
                          </span>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="w3-button w3-tiny w3-red w3-round"
                            onClick={() => {
                              const newSkills = [
                                ...(formik.values.skills || []),
                              ];
                              newSkills.splice(idx, 1);
                              formik.setFieldValue("skills", newSkills);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  </ul>
              </div>

              {/* スキル選択 */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={inputRef}
                  className="w3-input w3-border"
                  style={{ flex: 1, minWidth: 0 }}
                  type="text"
                  placeholder="スキル名で検索..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                <span className="w3-text-gray">
                  {skillsProp?.length || 0}個のスキルから選択
                </span>
              </div>              {/* 候補タグ */}
              <div style={{ marginTop: 8, marginBottom: 16 }}>
                {(() => {
                  const allSkills = Array.isArray(skillsProp) ? skillsProp : [];
                  const selectedSkillIds = (formik.values.skills || []).map(
                    (s) => s.skillId
                  );                  const filterText = debouncedSkillInput.toLowerCase();

                  const candidates = allSkills.filter((s) => {
                    const notSelected = !selectedSkillIds.includes(s.id);
                    const matchesFilter =
                      !filterText || s.name.toLowerCase().includes(filterText);
                    return notSelected && matchesFilter;
                  });                  if (candidates.length === 0) {
                    return (
                      <div
                        style={{
                          color: "#999",
                          fontStyle: "italic",
                          padding: "8px",
                        }}
                      >
                        {filterText
                          ? `「${skillInput}」に一致するスキルがありません。`
                          : "選択可能なスキルがありません。"}
                        <div className="w3-panel w3-pale-blue w3-border-blue w3-margin-top w3-small">
                          <p><strong>💡 ヒント:</strong> スキル管理画面で新しいスキルを会社に追加できます。</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginBottom: "8px",
                        }}
                      >
                        候補スキル ({candidates.length}個):
                      </div>
                      <div
                        style={{
                          maxHeight: "120px",
                          overflowY: "auto",
                          border: "1px solid #ddd",
                          padding: "8px",
                        }}
                      >
                        {candidates.map((skill) => (
                          <span
                            key={skill.id}
                            className="w3-tag w3-light-gray w3-margin-right w3-margin-bottom"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelectSkill(skill)}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {formik.touched.skills &&
                typeof formik.errors.skills === "string" && (
                  <div className="w3-text-red">{formik.errors.skills}</div>
                )}
            </div>
          </div>

          <footer className="w3-container w3-border-top w3-padding-16 w3-light-grey">
            <div className="w3-bar w3-right">
              <button
                type="button"
                className="w3-button w3-white w3-border w3-round-large w3-margin-right"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="w3-button w3-blue w3-round-large"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? "保存中..." : "保存"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EmployeeDialog;
