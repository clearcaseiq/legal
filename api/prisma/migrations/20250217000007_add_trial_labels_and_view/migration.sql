-- CreateTable
CREATE TABLE `trial_labels` (
    `casePk` BIGINT NOT NULL,
    `trialSetFlag` BOOLEAN NULL,
    `reachedTrialFlag` BOOLEAN NULL,

    PRIMARY KEY (`casePk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trial_labels` ADD CONSTRAINT `trial_labels_casePk_fkey` FOREIGN KEY (`casePk`) REFERENCES `cases`(`casePk`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateView
CREATE VIEW `v_train_trial_likelihood_t0` AS
SELECT
  s.*,
  l.`trialSetFlag` AS trial_set_flag,
  l.`reachedTrialFlag` AS reached_trial_flag
FROM `ml_feature_snapshots` s
JOIN `trial_labels` l ON l.`casePk` = s.`casePk`
WHERE s.`cutoffType` = 'T0_INTAKE'
  AND l.`trialSetFlag` IS NOT NULL;
