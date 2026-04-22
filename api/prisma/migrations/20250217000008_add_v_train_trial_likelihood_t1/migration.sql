-- CreateView
CREATE VIEW `v_train_trial_likelihood_t1` AS
SELECT
  s.*,
  l.`trialSetFlag` AS trial_set_flag,
  l.`reachedTrialFlag` AS reached_trial_flag
FROM `ml_feature_snapshots` s
JOIN `trial_labels` l ON l.`casePk` = s.`casePk`
WHERE s.`cutoffType` = 'T1_120D'
  AND l.`trialSetFlag` IS NOT NULL;
