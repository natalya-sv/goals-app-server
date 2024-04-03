const GoalStatus = Object.freeze({
  STARTED: "Started",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  ACCOMPLISHED: "Accomplished",
  ABORTED: "Aborted",
});

const getStatus = (status) => {
  const index = Object.values(GoalStatus).indexOf(status);
  const value = Object.keys(GoalStatus)[index];

  return value;
};
module.exports = { GoalStatus, getStatus };
