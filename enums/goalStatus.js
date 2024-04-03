const GoalStatus = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  STARTED: "STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PAUSED: "PAUSED",
  ACCOMPLISHED: "ACCOMPLISHED",
  ABORTED: "ABORTED",
});

const getStatus = (status) => {
  const index = Object.values(GoalStatus).indexOf(status);
  const value = Object.keys(GoalStatus)[index];

  return value;
};
module.exports = { GoalStatus, getStatus };
